import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "../config/config.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { create } from "content-disposition";

// Credentials are passed explicitly: the host has no instance metadata service
// for the SDK's default provider chain to fall back on.
const s3Client = new S3Client({
  region: config.s3.region,
  credentials: config.s3.credentials,
});

const URL_TTL_SECONDS = 300;

export const storage = {
  getUploadUrl: async (key: string, contentType: string) => {
    const putCommand = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(s3Client, putCommand, {
      expiresIn: URL_TTL_SECONDS,
    });
  },
  getDownloadUrl: async (key: string, fileName: string) => {
    const getCommand = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      ResponseContentDisposition: create(fileName, { type: "inline" }),
    });

    return await getSignedUrl(s3Client, getCommand, {
      expiresIn: URL_TTL_SECONDS,
    });
  },
  objectExists: async (key: string) => {
    try {
      await s3Client.send(
        new HeadObjectCommand({ Bucket: config.s3.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      if (err instanceof NotFound) return false;
      throw err;
    }
  },
  deleteObject: async (key: string) => {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }),
    );
  },
};
