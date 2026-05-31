import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAllWithSummary();
  }

  @Get('activity/summary')
  getActivitySummary() {
    return this.usersService.getTraceabilitySummary();
  }

  @Get('buyers/:email')
  getBuyerDetail(@Param('email') email: string) {
    return this.usersService.getBuyerDetail(email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
