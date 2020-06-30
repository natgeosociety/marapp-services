import { SchemaOptions } from 'mongoose';

/**
 * Mongo default schema options.
 */
export const schemaOptions: SchemaOptions = {
  toObject: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  timestamps: true,
  minimize: false, // store empty objects;
};
