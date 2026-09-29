import { IsNotEmpty, IsString } from 'class-validator';

// export class PartnerDataDto {
//   @IsString()
//   @IsNotEmpty({ message: 'partner_id is required' })
//   partner_id: string;

//   // Allows any additional properties because different partners have different schemas
//   [key: string]: any;
// }

export class PartnerDataDto {
  partner_id: string;
  mobile: string;
  full_name: string;
}