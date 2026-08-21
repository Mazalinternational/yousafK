import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, File, X, Eye, FileTextIcon } from "lucide-react";

import { baseURL } from "@/api/client";
import { cn } from "@/lib/utils";
interface FileInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value"
> {
  onFileSelect?: (file: File | null) => void;
  value?: File | null | string; // string = remote file path, File = local file
  ref?: React.Ref<HTMLInputElement>;
}

const FileInput = ({
  onFileSelect,
  value,
  ref,
  onFocus,
  onBlur,
  ...props
}: FileInputProps) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileCategory, setFileCategory] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const hasValue = React.useMemo(() => {
    if (typeof value === "string") return value.trim().length > 0;
    if (value && typeof value === "object") return true;
    return Boolean(file);
  }, [file, value]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const formItem = container.closest('[data-slot="form-item"]');
    const label = formItem?.querySelector(
      '[data-slot="form-label"]',
    ) as HTMLLabelElement | null;
    if (!label) return;

    label.setAttribute("data-floating", "true");
    label.setAttribute("data-float", hasValue || isFocused ? "true" : "false");
  }, [hasValue, isFocused]);

  // Cleanup preview URL on unmount or change
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    onFileSelect?.(selectedFile);

    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      const mimeType = selectedFile.type;

      if (mimeType.includes("pdf")) {
        setFileCategory("pdf");
      } else if (mimeType.includes("image")) {
        setFileCategory("image");
      } else if (mimeType.includes("word")) {
        setFileCategory("word");
      } else if (
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet")
      ) {
        setFileCategory("excel");
      } else if (
        mimeType.includes("powerpoint") ||
        mimeType.includes("presentation")
      ) {
        setFileCategory("powerpoint");
      } else if (mimeType.includes("text")) {
        setFileCategory("text");
      } else {
        setFileCategory("other");
      }
    } else {
      setPreviewUrl(null);
      setFileCategory(null);
    }
  };

  // Handle removing selected file (local or remote)
  const handleRemoveFile = React.useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setFileCategory(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileSelect?.(null);
  }, [onFileSelect]);

  // Handle external value changes (prop changes)
  React.useEffect(() => {
    if (!value) {
      handleRemoveFile();
      return;
    }

    if (typeof value === "string") {
      // Remote file case — prepend imported baseUrl
      const fullUrl = `${baseURL}/${value}`;
      setPreviewUrl(fullUrl);

      // Guess category from extension
      const lower = value.toLowerCase();
      if (lower.endsWith(".pdf")) {
        setFileCategory("pdf");
      } else if (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".svg")
      ) {
        setFileCategory("image");
      } else if (
        lower.endsWith(".doc") ||
        lower.endsWith(".docx") ||
        lower.endsWith(".dotx")
      ) {
        setFileCategory("word");
      } else if (
        lower.endsWith(".xls") ||
        lower.endsWith(".xlsx") ||
        lower.endsWith(".csv")
      ) {
        setFileCategory("excel");
      } else if (
        lower.endsWith(".ppt") ||
        lower.endsWith(".pptx") ||
        lower.endsWith(".ppsx")
      ) {
        setFileCategory("powerpoint");
      } else if (lower.endsWith(".txt")) {
        setFileCategory("text");
      } else {
        setFileCategory("other");
      }

      // Clear local file state
      setFile(null);
    } else {
      // Local File object case
      setFile(value);
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);

      const mimeType = value.type;

      if (mimeType.includes("pdf")) {
        setFileCategory("pdf");
      } else if (mimeType.includes("image")) {
        setFileCategory("image");
      } else if (mimeType.includes("word")) {
        setFileCategory("word");
      } else if (
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet")
      ) {
        setFileCategory("excel");
      } else if (
        mimeType.includes("powerpoint") ||
        mimeType.includes("presentation")
      ) {
        setFileCategory("powerpoint");
      } else if (mimeType.includes("text")) {
        setFileCategory("text");
      } else {
        setFileCategory("other");
      }
    }
  }, [value, handleRemoveFile]);

  const renderPreview = () => {
    if (!previewUrl) return null;

    switch (fileCategory) {
      case "image":
        return (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[70vh] object-contain"
          />
        );
      case "pdf":
        return (
          <iframe
            src={previewUrl}
            className="w-full h-[70vh]"
            title="PDF Preview"
          />
        );
      case "word":
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded">
            <FileTextIcon className="h-16 w-16 text-blue-500 mb-4" />
            <span className="text-lg font-medium text-blue-800">
              {typeof value === "string" ? value : file?.name || "Document"}
            </span>
            <p className="text-sm text-blue-600 mt-2">
              Microsoft Word Document
            </p>
          </div>
        );
      case "excel":
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded">
            <FileTextIcon className="h-16 w-16 text-green-500 mb-4" />
            <span className="text-lg font-medium text-green-800">
              {typeof value === "string" ? value : file?.name || "Spreadsheet"}
            </span>
            <p className="text-sm text-green-600 mt-2">
              Microsoft Excel Spreadsheet
            </p>
          </div>
        );
      case "powerpoint":
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-orange-50 rounded">
            <FileTextIcon className="h-16 w-16 text-orange-500 mb-4" />
            <span className="text-lg font-medium text-orange-800">
              {typeof value === "string" ? value : file?.name || "Presentation"}
            </span>
            <p className="text-sm text-orange-600 mt-2">
              Microsoft PowerPoint Presentation
            </p>
          </div>
        );
      case "text":
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded">
            <FileText className="h-16 w-16 text-gray-500 mb-4" />
            <span className="text-lg font-medium text-gray-700">
              {typeof value === "string" ? value : file?.name || "Text File"}
            </span>
            <p className="text-sm text-gray-500 mt-2">Text Document</p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded">
            <File className="h-16 w-16 text-gray-500 mb-4" />
            <span className="text-lg font-medium text-gray-700">
              {typeof value === "string" ? value : file?.name || "File"}
            </span>
            <p className="text-sm text-gray-500 mt-2">
              {file?.type || "Unknown type"} - Preview not available
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            ref={(node) => {
              if (ref) {
                if (typeof ref === "function") {
                  ref(node);
                } else if (node !== null) {
                  (ref as React.RefObject<HTMLInputElement>).current = node;
                }
              }
              inputRef.current = node;
            }}
            type="file"
            onChange={handleFileChange}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            {...props}
            className={cn(
              "pr-20 h-10.5",
              isFocused && "border-[#FEA317] ring-1 ring-[#FEA317]",
              props.className,
            )}
          />
          {(file || typeof value === "string") && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1 space-x-1">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="max-w-3xl max-h-[80vh] overflow-auto"
                  aria-describedby={undefined}
                >
                  <DialogHeader>
                    <DialogTitle>File Preview</DialogTitle>
                  </DialogHeader>
                  {/* TODO: Implement PDF Viewer */}
                  {typeof value === "string" &&
                  fileCategory === "pdf" ? null : (
                    <div className="mt-4">{renderPreview()}</div>
                  )}

                  <div className="mt-4 text-sm text-gray-500">
                    {typeof value === "string" ? (
                      <>
                        <p>File Type: {value.split(".")[1]}</p>
                        <p>Source: Remote</p>
                      </>
                    ) : file ? (
                      <>
                        <p>File name: {file.name}</p>
                        <p>File size: {(file.size / 1024).toFixed(2)} KB</p>
                        <p>File type: {file.type || "Unknown"}</p>
                      </>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                type="button"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { FileInput };
