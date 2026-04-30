// src/dto/network-topology.dto.ts
// DTOs for Network Topology CRUD operations

import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NodeType {
  LCS = 'LCS',
  NASTAWNIA = 'NASTAWNIA',
  PRZEJAZD = 'PRZEJAZD',
  SKP = 'SKP',
  SWITCH = 'SWITCH',
  ROUTER = 'ROUTER',
  AUXILIARY = 'AUXILIARY',
}

export enum NodeSourceType {
  TASK = 'task',
  EXTERNAL = 'external',
  AUXILIARY = 'auxiliary',
}

export class TopologyNodeDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(NodeType)
  type: NodeType;

  @IsEnum(NodeSourceType)
  sourceType: NodeSourceType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label: string;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;

  @IsNumber()
  @IsOptional()
  kilometre?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  taskId?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export enum ConnectionTechnology {
  FIBER = 'FIBER',
  LAN = 'LAN',
}

export class TopologyConnectionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  sourceNodeId: string;

  @IsString()
  targetNodeId: string;

  @IsEnum(ConnectionTechnology)
  technology: ConnectionTechnology;

  @IsNumber()
  @IsOptional()
  @Min(0)
  distance?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateNetworkTopologyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(1)
  contractId: number;

  @IsInt()
  @Min(0)
  subsystemIndex: number;

  @IsString()
  subsystemType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopologyNodeDto)
  nodes: TopologyNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopologyConnectionDto)
  connections: TopologyConnectionDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateNetworkTopologyDto extends CreateNetworkTopologyDto {
  // Przy "update" tworzymy nową wersję z tymi danymi (immutable rows)
}

export class GetHistoryDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number;
}
