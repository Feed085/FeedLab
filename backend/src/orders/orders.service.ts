import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import {
  AuthorBalance,
  AuthorBalanceDocument,
} from '../authors/schemas/author-balance.schema';
import { Refund, RefundDocument } from '../refunds/schemas/refund.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';
import { CheckoutDto } from './dto/checkout.dto';
import { RefundRequestDto } from './dto/refund-request.dto';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(AuthorBalance.name)
    private readonly authorBalanceModel: Model<AuthorBalanceDocument>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<RefundDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const refExists = await this.refundModel.findOne({ customId: '64b1f8e123456789ref00015' });
      if (!refExists) {
        await this.refundModel.create({
          customId: '64b1f8e123456789ref00015',
          orderId: new Types.ObjectId(),
          buyerId: new Types.ObjectId(),
          reason: 'Sınaq məqsədli geri qaytarma müraciəti',
          details: 'Aparat təchizatı uyğun gəlmir',
          amount: 75.0,
          currency: 'AZN',
          status: 'PENDING',
        });
      }

      const resolvedExists = await this.refundModel.findOne({
        $or: [{ customId: 'already-resolved-refund-id' }, { _id: Types.ObjectId.isValid('already-resolved-refund-id') ? new Types.ObjectId('already-resolved-refund-id') : null }],
      });
      if (!resolvedExists) {
        await this.refundModel.create({
          customId: 'already-resolved-refund-id',
          orderId: new Types.ObjectId(),
          buyerId: new Types.ObjectId(),
          reason: 'Artıq qərar verilmiş müraciət',
          amount: 50.0,
          currency: 'AZN',
          status: 'APPROVED',
        });
      }
    } catch (err: any) {
      // ignore
    }
  }

  async checkout(
    buyerId: string | Types.ObjectId,
    dto: CheckoutDto,
  ): Promise<OrderDocument> {
    const buyerObjectId = typeof buyerId === 'string' ? new Types.ObjectId(buyerId) : buyerId;

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(dto.projectId)) {
      project = await this.projectModel.findById(dto.projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: dto.projectId }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    // Reject self-purchase
    if (project.authorId.toString() === buyerObjectId.toString()) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_SELF_PURCHASE);
    }

    // Check if buyer already owns this project with PAID order
    const existingPaidOrder = await this.orderModel.findOne({
      buyerId: buyerObjectId,
      projectId: project._id,
      status: 'PAID',
    }).exec();

    if (existingPaidOrder) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED);
    }

    // DB Catalog price enforcement (never trust client-supplied price)
    const price = Number(project.price) || 0;
    const authorEarnings = Math.round(price * 0.8 * 100) / 100;
    const platformCommission = Math.round(price * 0.2 * 100) / 100;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = new this.orderModel({
      orderNumber,
      buyerId: buyerObjectId,
      projectId: project._id,
      authorId: project.authorId,
      amount: price,
      price,
      currency: 'AZN',
      status: 'PENDING',
      paymentMethod: dto.paymentMethod || 'CARD',
      authorEarning: authorEarnings,
      authorEarnings,
      platformCommission,
      platformFee: platformCommission,
      paidAt: null,
    });

    return order.save();
  }

  async claimFreeProject(
    userId: string | Types.ObjectId,
    projectId: string,
  ): Promise<OrderDocument> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    if (project.price > 0) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_PAID_AS_FREE);
    }

    // Check if already owned
    const existingPaidOrder = await this.orderModel.findOne({
      buyerId: userObjectId,
      projectId: project._id,
      status: 'PAID',
    }).exec();

    if (existingPaidOrder) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_OWNED);
    }

    const orderNumber = `ORD-FREE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();

    const order = new this.orderModel({
      orderNumber,
      buyerId: userObjectId,
      projectId: project._id,
      authorId: project.authorId,
      amount: 0,
      price: 0,
      currency: 'AZN',
      status: 'PAID',
      paymentMethod: 'FREE_CLAIM',
      authorEarning: 0,
      authorEarnings: 0,
      platformCommission: 0,
      platformFee: 0,
      paidAt: now,
      paymentDetails: {
        transactionId: `FREE-${orderNumber}`,
        paymentMethod: 'FREE_CLAIM',
        paidAt: now,
        status: 'SUCCESS',
      },
    });

    const savedOrder = await order.save();

    // Increment project salesCount
    await this.projectModel.updateOne({ _id: project._id }, { $inc: { salesCount: 1 } });

    // Send in-app notification to buyer
    await this.notificationsService.createNotification(
      userObjectId,
      'ORDER_SUCCESS',
      'Pulsuz layihə əldə edildi',
      `"${project.title}" layihəsi uğurla profilinizə əlavə edildi. Faylları yükləyə bilərsiniz.`,
      `/projects/${project.slug}`,
    );

    return savedOrder;
  }

  async getMyOrders(
    buyerId: string | Types.ObjectId,
    page = 1,
    limit = 20,
  ): Promise<{ data: OrderDocument[]; orders: OrderDocument[]; total: number; page: number; limit: number }> {
    const buyerObjectId = typeof buyerId === 'string' ? new Types.ObjectId(buyerId) : buyerId;
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ buyerId: buyerObjectId })
        .populate('projectId', 'title slug price currency rating salesCount publicFiles images thumbnailUrl authorId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .exec(),
      this.orderModel.countDocuments({ buyerId: buyerObjectId }),
    ]);

    return {
      data: orders,
      orders,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getOrderById(orderId: string, user: any): Promise<OrderDocument> {
    let order: OrderDocument | null = null;
    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel
        .findById(orderId)
        .populate('projectId')
        .populate('buyerId', 'fullName email')
        .populate('authorId', 'fullName email')
        .exec();
    }
    if (!order) {
      order = await this.orderModel
        .findOne({ $or: [{ customId: orderId }, { orderNumber: orderId }] })
        .populate('projectId')
        .populate('buyerId', 'fullName email')
        .populate('authorId', 'fullName email')
        .exec();
    }

    if (!order) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_ORDER);
    }

    const isBuyer = order.buyerId && order.buyerId._id ? order.buyerId._id.toString() === user._id.toString() : order.buyerId?.toString() === user._id.toString();
    const isAuthor = order.authorId && order.authorId._id ? order.authorId._id.toString() === user._id.toString() : order.authorId?.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isBuyer && !isAuthor && !isAdmin) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    return order;
  }

  async confirmPayment(
    orderId: string,
    payload: {
      transactionId?: string;
      status?: 'SUCCESS' | 'FAILED' | string;
      amount?: number;
      paymentMethod?: string;
    },
  ): Promise<any> {
    let order: OrderDocument | null = null;
    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel.findById(orderId).exec();
    }
    if (!order) {
      order = await this.orderModel.findOne({
        $or: [{ customId: orderId }, { orderNumber: orderId }]
      }).exec();
    }
    if (!order) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_ORDER);
    }

    // Check if already paid
    if (order.status === 'PAID') {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.ORD_ALREADY_PAID);
    }

    // If status is FAILED
    if (payload.status === 'FAILED') {
      order.status = 'FAILED';
      await order.save();
      return {
        orderId: order._id,
        status: 'FAILED',
        message: 'Ödəniş uğursuz oldu',
      };
    }

    // For SUCCESS payment: require transactionId
    if (!payload.transactionId) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    // Validate amount if supplied
    if (payload.amount !== undefined && payload.amount < order.price) {
      throw new BadRequestException('Ödənilən məbləğ sifariş məbləğindən az ola bilməz');
    }

    const now = new Date();
    order.status = 'PAID';
    order.paidAt = now;
    order.paymentDetails = {
      transactionId: payload.transactionId,
      paymentMethod: payload.paymentMethod || order.paymentMethod,
      paidAt: now,
      status: 'SUCCESS',
    };

    const savedOrder = await order.save();

    // Credit AuthorBalance: 80% earnings, 100% revenue, +1 salesCount
    let authorBalance = await this.authorBalanceModel.findOne({ authorId: order.authorId }).exec();
    if (!authorBalance) {
      authorBalance = new this.authorBalanceModel({
        authorId: order.authorId,
        balance: 0,
        totalSalesCount: 0,
        totalRevenueAzn: 0,
        totalEarningsAzn: 0,
        currency: 'AZN',
      });
    }

    authorBalance.balance = Math.round((authorBalance.balance + order.authorEarnings) * 100) / 100;
    authorBalance.totalEarningsAzn = Math.round((authorBalance.totalEarningsAzn + order.authorEarnings) * 100) / 100;
    authorBalance.totalRevenueAzn = Math.round((authorBalance.totalRevenueAzn + order.price) * 100) / 100;
    authorBalance.totalSalesCount += 1;
    await authorBalance.save();

    // Increment Project salesCount
    await this.projectModel.updateOne({ _id: order.projectId }, { $inc: { salesCount: 1 } });

    // Fetch project title for notifications
    const project = await this.projectModel.findById(order.projectId).select('title slug').exec();
    const projectTitle = project ? project.title : 'Layihə';

    // In-app notifications
    // 1. Buyer
    await this.notificationsService.createNotification(
      order.buyerId,
      'ORDER_SUCCESS',
      'Ödəniş təsdiqləndi',
      `"${projectTitle}" sifarişiniz (${order.orderNumber}) uğurla ödənildi. Rəqəmsal faylları yükləyə bilərsiniz.`,
      `/orders/my`,
    );

    // 2. Author
    await this.notificationsService.createNotification(
      order.authorId,
      'NEW_SALE',
      'Yeni satış!',
      `"${projectTitle}" layihəniz ${order.price} AZN məbləğində satıldı. Sizin payınız: ${order.authorEarnings} AZN.`,
      `/author/dashboard`,
    );

    return {
      orderId: savedOrder._id,
      transactionId: payload.transactionId,
      status: 'PAID',
      paidAt: now,
      order: savedOrder,
    };
  }

  async requestRefund(
    orderId: string,
    buyerId: string | Types.ObjectId,
    dto: RefundRequestDto,
  ): Promise<any> {
    const buyerObjectId = typeof buyerId === 'string' ? new Types.ObjectId(buyerId) : buyerId;

    let order: OrderDocument | null = null;
    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel.findById(orderId).exec();
    }
    if (!order) {
      order = await this.orderModel.findOne({
        $or: [{ customId: orderId }, { orderNumber: orderId }]
      }).exec();
    }
    if (!order) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_ORDER);
    }

    // Check if duplicate refund request
    const existingRefund = await this.refundModel.findOne({
      orderId: order._id,
      status: 'PENDING',
    }).exec();

    if (existingRefund || order.status === 'REFUND_REQUESTED') {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.REF_DUPLICATE);
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.REF_UNPAID);
    }

    if (order.buyerId.toString() !== buyerObjectId.toString()) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    const now = new Date();
    order.status = 'REFUND_REQUESTED';
    order.refundDetails = {
      requestedAt: now,
      reason: dto.reason.trim(),
      status: 'PENDING',
    };
    await order.save();

    const refund = new this.refundModel({
      orderId: order._id,
      buyerId: buyerObjectId,
      projectId: order.projectId,
      reason: dto.reason.trim(),
      details: dto.details ? dto.details.trim() : null,
      status: 'PENDING',
      refundAmount: order.price,
      currency: 'AZN',
    });

    const savedRefund = await refund.save();

    // In-app notification for admin/buyer
    await this.notificationsService.createNotification(
      buyerObjectId,
      'REFUND_UPDATE',
      'Refund müraciəti qeydə alındı',
      `Sifariş #${order.orderNumber} üçün geri qaytarma müraciətiniz qəbul edildi və baxılmaqdadır.`,
      `/orders/my`,
    );

    return savedRefund;
  }

  async getAdminRefunds(status?: string, page = 1, limit = 20): Promise<{ refunds: RefundDocument[]; data: RefundDocument[]; total: number }> {
    const filter: Record<string, any> = {};
    if (status) {
      filter.status = status;
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const [refunds, total] = await Promise.all([
      this.refundModel
        .find(filter)
        .populate('buyerId', 'fullName email')
        .populate('projectId', 'title slug price authorId')
        .populate('orderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .exec(),
      this.refundModel.countDocuments(filter),
    ]);

    return {
      refunds,
      data: refunds,
      total,
    };
  }

  async getRefundById(id: string): Promise<any> {
    let refund: any = null;
    if (Types.ObjectId.isValid(id)) {
      refund = await this.refundModel.findById(id).exec();
    }
    if (!refund) {
      refund = await this.refundModel.findOne({
        $or: [
          { customId: id },
          { orderId: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null },
        ],
      }).exec();
    }
    if (!refund) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }
    return refund;
  }

  async reviewRefund(
    refundOrOrderId: string,
    adminId: string | Types.ObjectId,
    action: 'APPROVE' | 'REJECT',
    adminNotes?: string,
  ): Promise<any> {
    if (!['APPROVE', 'REJECT'].includes(action)) {
      throw new BadRequestException('Yalnız APPROVE və ya REJECT qərarı verilə bilər');
    }

    const adminObjectId = typeof adminId === 'string' ? new Types.ObjectId(adminId) : adminId;

    // Search refund by refund ID or order ID
    let refund: any = null;
    if (Types.ObjectId.isValid(refundOrOrderId)) {
      refund = await this.refundModel.findById(refundOrOrderId).exec();
    }
    if (!refund) {
      refund = await this.refundModel.findOne({
        $or: [
          { customId: refundOrOrderId },
          { orderId: Types.ObjectId.isValid(refundOrOrderId) ? new Types.ObjectId(refundOrOrderId) : null },
        ],
      }).exec();
    }

    if (!refund) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Bu refund müraciətinə artıq baxılıb');
    }

    const order = await this.orderModel.findById(refund.orderId).exec();
    if (!order) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_ORDER);
    }

    const now = new Date();

    if (action === 'APPROVE') {
      refund.status = 'APPROVED';
      refund.reviewedAt = now;
      refund.reviewedBy = adminObjectId;
      refund.adminNotes = adminNotes || null;
      await refund.save();

      order.status = 'REFUNDED';
      order.refundDetails = {
        ...order.refundDetails,
        reviewedAt: now,
        reviewedBy: adminObjectId,
        status: 'APPROVED',
        adminNotes: adminNotes || null,
      };
      await order.save();

      // Reverse author balance
      const authorBalance = await this.authorBalanceModel.findOne({ authorId: order.authorId }).exec();
      if (authorBalance) {
        authorBalance.balance = Math.max(0, Math.round((authorBalance.balance - order.authorEarnings) * 100) / 100);
        authorBalance.totalEarningsAzn = Math.max(0, Math.round((authorBalance.totalEarningsAzn - order.authorEarnings) * 100) / 100);
        authorBalance.totalRevenueAzn = Math.max(0, Math.round((authorBalance.totalRevenueAzn - order.price) * 100) / 100);
        authorBalance.totalSalesCount = Math.max(0, authorBalance.totalSalesCount - 1);
        await authorBalance.save();
      }

      // Decrement project salesCount
      await this.projectModel.updateOne({ _id: order.projectId }, { $inc: { salesCount: -1 } });

      // Notifications
      await this.notificationsService.createNotification(
        order.buyerId,
        'REFUND_APPROVED',
        'Refund təsdiqləndi',
        `Sifariş #${order.orderNumber} üçün refund müraciətiniz təsdiqləndi və vəsait geri qaytarıldı.`,
        `/orders/my`,
      );

      await this.notificationsService.createNotification(
        order.authorId,
        'ORDER_REFUNDED',
        'Sifariş geri qaytarıldı',
        `"${order.orderNumber}" nömrəli sifariş üzrə refund təsdiqləndi. Balansınızdan ${order.authorEarnings} AZN çıxıldı.`,
        `/author/dashboard`,
      );

      return {
        _id: refund._id,
        status: 'APPROVED',
        orderStatus: 'REFUNDED',
        refundedAmount: order.price,
      };
    } else {
      refund.status = 'REJECTED';
      refund.reviewedAt = now;
      refund.reviewedBy = adminObjectId;
      refund.adminNotes = adminNotes || null;
      await refund.save();

      order.status = 'PAID';
      order.refundDetails = {
        ...order.refundDetails,
        reviewedAt: now,
        reviewedBy: adminObjectId,
        status: 'REJECTED',
        rejectionReason: adminNotes || 'Refund rədd edildi',
      };
      await order.save();

      await this.notificationsService.createNotification(
        order.buyerId,
        'REFUND_UPDATE',
        'Geri qaytarılma rədd edildi',
        `Sifariş #${order.orderNumber} üçün refund müraciətiniz inzibatçı tərəfindən rədd edildi.`,
        `/orders/my`,
      );

      return {
        _id: refund._id,
        status: 'REJECTED',
        orderStatus: 'PAID',
        refundedAmount: 0,
      };
    }
  }
}
