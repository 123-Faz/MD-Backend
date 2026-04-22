import path from "path"
export const uploadFile = async (options: {
  file: Express.Multer.File;
  folder: string;
  allowedMimeTypes: string[];
}): Promise<{ filename: string; url: string } | null> => {
  const { file, folder, allowedMimeTypes } = options;

  // Validate file type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} not allowed`);
  }

  // Generate unique filename
  const fileExtension = path.extname(file.originalname);
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
  const filePath = path.join(folder, fileName);

  // Upload logic (to AWS S3, local storage, etc.)
  // Implement your file storage logic here
  
  return {
    filename: fileName,
    url: `/uploads/${filePath}` // Adjust based on your storage
  };
};