import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TicketsService } from './tickets.service';
import { Ticket } from './schemas/ticket.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

describe('TicketsService', () => {
  let service: TicketsService;
  let mockTicketModel: any;
  let mockNotificationsService: any;

  const mockUserId = new Types.ObjectId();
  const mockTicketId = new Types.ObjectId();

  beforeEach(async () => {
    mockTicketModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: mockTicketId,
      save: jest.fn().mockResolvedValue({ ...dto, _id: mockTicketId }),
    }));
    mockTicketModel.findById = jest.fn();
    mockTicketModel.find = jest.fn();
    mockTicketModel.countDocuments = jest.fn();

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getModelToken(Ticket.name), useValue: mockTicketModel },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  describe('createTicket', () => {
    it('creates ticket with OPEN status and ticketNumber starting with TCK-', async () => {
      const user = { _id: mockUserId.toString(), fullName: 'Rəşad Məmmədov', role: 'USER' };
      const result = await service.createTicket(user, {
        subject: 'Montaj təlimatı sualı',
        category: 'TECHNICAL',
        description: 'Rezistorun nominal dəyərini dəqiqləşdirə bilərsinizmi?',
      });

      expect(result.status).toBe('OPEN');
      expect(result.ticketNumber).toMatch(/^TCK-/);
      expect(result.messages.length).toBe(1);
      expect(result.messages[0].senderRole).toBe('USER');
    });

    it('rejects ticket creation with missing subject or description with VAL_REQUIRED_FIELD', async () => {
      const user = { _id: mockUserId.toString(), role: 'USER' };
      await expect(
        service.createTicket(user, {
          subject: '',
          category: 'GENERAL',
          description: '',
        }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_REQUIRED_FIELD));
    });
  });

  describe('addMessage', () => {
    it('appends message to ticket and transitions OPEN to IN_PROGRESS when admin replies', async () => {
      const ticketDoc = {
        _id: mockTicketId,
        userId: mockUserId,
        status: 'OPEN',
        subject: 'Texniki sual',
        messages: [],
        save: jest.fn().mockResolvedValue({}),
      };

      mockTicketModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(ticketDoc),
      });

      const adminUser = { _id: new Types.ObjectId().toString(), fullName: 'Admin', role: 'ADMIN' };
      const result = await service.addMessage(mockTicketId.toString(), adminUser, {
        message: 'Salam, rezistor 10kOhm olmalıdır.',
      });

      expect(result.message).toBe('Salam, rezistor 10kOhm olmalıdır.');
      expect(result.senderRole).toBe('ADMIN');
      expect(ticketDoc.status).toBe('IN_PROGRESS');
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('rejects reply when ticket is CLOSED', async () => {
      const closedTicket = {
        _id: mockTicketId,
        userId: mockUserId,
        status: 'CLOSED',
        messages: [],
      };

      mockTicketModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(closedTicket),
      });

      const user = { _id: mockUserId.toString(), role: 'USER' };
      await expect(
        service.addMessage(mockTicketId.toString(), user, { message: 'Yeni mesaj' }),
      ).rejects.toThrow(new BadRequestException('Bağlanmış biletə yeni mesaj yazıla bilməz'));
    });
  });
});
