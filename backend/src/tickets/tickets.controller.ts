import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';
import { TicketStatusDto } from './dto/ticket-status.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async createTicket(
    @CurrentUser() user: any,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(user, dto);
  }

  @Get()
  async getUserTickets(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.ticketsService.getUserTickets(user, pageNum, limitNum);
  }

  @Get(':id')
  async getTicketById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.getTicketById(id, user);
  }

  @Post(':id/messages')
  async addMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: TicketMessageDto,
  ) {
    return this.ticketsService.addMessage(id, user, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: TicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, user, dto.status);
  }
}
