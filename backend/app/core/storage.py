import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional
import uuid
from fastapi import UploadFile

class S3StorageService:
    def __init__(self):
        self.endpoint_url = f"http://{os.getenv('MINIO_ENDPOINT', 'localhost:9000')}"
        self.public_endpoint_url = f"http://{os.getenv('MINIO_PUBLIC_ENDPOINT', 'localhost:9000')}"
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'hostbuddy')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'hostbuddy123')
        self.bucket_name = os.getenv('MINIO_BUCKET', 'images')
        self.secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name='us-east-1'  # MinIO doesn't care about region
        )
        
        # Create bucket if it doesn't exist
        self._create_bucket_if_not_exists()
    
    def _create_bucket_if_not_exists(self):
        """Create the bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                # Set bucket policy to allow public read access to images
                bucket_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{self.bucket_name}/*"
                        }
                    ]
                }
                import json
                self.s3_client.put_bucket_policy(
                    Bucket=self.bucket_name,
                    Policy=json.dumps(bucket_policy)
                )
            except ClientError as e:
                print(f"Error creating bucket: {e}")
    
    async def upload_file(self, file: UploadFile, folder: str = "events") -> Optional[str]:
        """Upload a file and return the public URL"""
        try:
            # Generate unique filename
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"
            
            # Read file content
            file_content = await file.read()
            await file.seek(0)  # Reset file pointer
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType=file.content_type or 'image/jpeg'
            )
            
            # Return public URL
            public_url = f"{self.public_endpoint_url}/{self.bucket_name}/{unique_filename}"
            return public_url
            
        except Exception as e:
            print(f"Error uploading file: {e}")
            return None
    
    def delete_file(self, file_url: str) -> bool:
        """Delete a file using its URL"""
        try:
            # Extract key from URL
            # URL format: http://minio:9000/images/events/uuid.jpg
            key = file_url.split(f"{self.bucket_name}/")[-1]
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
            
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False

# Global instance
storage_service = S3StorageService()