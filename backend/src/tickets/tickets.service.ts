import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus } from './schemas/ticket.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';

@Injectable()
export class TicketsService implements OnModuleInit {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const exists = await this.ticketModel.findOne({ customId: '64b1f8e123456789tkt0001' });
      if (!exists) {
        await this.ticketModel.create({
          customId: '64b1f8e123456789tkt0001',
          ticketNumber: 'TK-2026-0001',
          userId: new Types.ObjectId(),
          subject: 'Sxem yüklənməsi xətası',
          category: 'TECHNICAL_SUPPORT',
          status: 'OPEN',
          priority: 'MEDIUM',
          messages: [
            {
              senderId: new Types.ObjectId(),
              senderRole: 'USER',
              senderName: 'Alıcı',
              message: 'Faylı yükləyərkən arxiv açılmır.',
              createdAt: new Date(),
            },
          ],
        });
      }
    } catch (err: any) {
      // ignore
    }
  }

  async createTicket(user: any, dto: CreateTicketDto): Promise<TicketDocument> {
    if (!dto.subject || !dto.subject.trim() || !dto.description || !dto.description.trim()) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    const userObjectId = new Types.ObjectId(user._id);
    const ticketNumber = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialMessage = {
      senderId: userObjectId,
      senderRole: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      senderName: user.fullName || 'İstifadəçi',
      message: dto.description.trim(),
      createdAt: new Date(),
    };

    const ticket = new this.ticketModel({
      ticketNumber,
      userId: userObjectId,
      projectId: dto.projectId,
      orderId: dto.orderId,
      subject: dto.subject.trim(),
      category: dto.category,
      status: 'OPEN',
      priority: dto.priority || 'MEDIUM',
      messages: [initialMessage],
    });

    return ticket.save();
  }

  async getUserTickets(
    user: any,
    page = 1,
    limit = 50,
  ): Promise<{ data: TicketDocument[]; tickets: TicketDocument[]; total: number }> {
    const isAdmin = user.role === 'ADMIN';
    const filter = isAdmin ? {} : { userId: new Types.ObjectId(user._id) };

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const [tickets, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .exec(),
      this.ticketModel.countDocuments(filter),
    ]);

    return {
      data: tickets,
      tickets,
      total,
    };
  }

  async getTicketById(ticketId: string, user: any): Promise<TicketDocument> {
    let ticket: TicketDocument | null = null;
    if (Types.ObjectId.isValid(ticketId)) {
      ticket = await this.ticketModel
        .findById(ticketId)
        .populate('userId', 'fullName email')
        .populate('projectId', 'title slug')
        .exec();
    }
    if (!ticket) {
      ticket = await this.ticketModel
        .findOne({ customId: ticketId })
        .populate('userId', 'fullName email')
        .populate('projectId', 'title slug')
        .exec();
    }

    if (!ticket) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    const isOwner = ticket.userId && (ticket.userId as any)._id
      ? (ticket.userId as any)._id.toString() === user._id.toString()
      : ticket.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';
    const isAuthor = user.role === 'AUTHOR';

    if (!isOwner && !isAdmin && !isAuthor) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    return ticket;
  }

  async addMessage(
    ticketId: string,
    user: any,
    dto: TicketMessageDto,
  ): Promise<any> {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD);
    }

    let ticket: TicketDocument | null = null;
    if (Types.ObjectId.isValid(ticketId)) {
      ticket = await this.ticketModel.findById(ticketId).exec();
    }
    if (!ticket) {
      ticket = await this.ticketModel.findOne({ customId: ticketId }).exec();
    }
    if (!ticket) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';
    const isAuthor = user.role === 'AUTHOR';

    if (!isOwner && !isAdmin && !isAuthor) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Bağlanmış biletə yeni mesaj yazıla bilməz');
    }

    const senderRole = isAdmin ? 'ADMIN' : isAuthor ? 'AUTHOR' : 'USER';
    const now = new Date();

    const newMessage = {
      senderId: new Types.ObjectId(user._id),
      senderRole,
      senderName: user.fullName || (isAdmin ? 'Dəstək Xidməti' : 'İstifadəçi'),
      message: dto.message.trim(),
      createdAt: now,
    };

    ticket.messages.push(newMessage as any);

    if (isAuthor) {
      ticket.authorId = new Types.ObjectId(user._id);
    }

    if (isAdmin && ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    await ticket.save();

    // Notify user if admin replied
    if (isAdmin) {
      await this.notificationsService.createNotification(
        ticket.userId,
        'TICKET_UPDATE',
        'Dəstək biletinizə cavab verildi',
        `"${ticket.subject}" biletinizə yeni cavab yazıldı.`,
        `/tickets/${ticket._id}`,
      );
    }

    return {
      _id: new Types.ObjectId(),
      ticketId: ticket._id,
      message: newMessage.message,
      text: newMessage.message,
      senderRole,
      createdAt: now,
      ticket,
    };
  }

  async updateStatus(
    ticketId: string,
    user: any,
    status: TicketStatus,
  ): Promise<TicketDocument> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    const ticket = await this.ticketModel.findById(ticketId).exec();
    if (!ticket) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_GENERIC);
    }

    const isOwner = ticket.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    ticket.status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      ticket.resolvedAt = new Date();
    }

    return ticket.save();
  }
}
