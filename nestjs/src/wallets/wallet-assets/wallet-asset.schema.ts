import { Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  collection: 'WalletAsset',
})
export class WalletAsset {}

export const WalletAssetSchema = SchemaFactory.createForClass(WalletAsset);
