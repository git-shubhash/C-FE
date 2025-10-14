import React, { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (appointmentId: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  // Initialize QR Scanner when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        initializeScanner();
      }, 300);

      return () => {
        clearTimeout(timer);
        stopScanning();
      };
    } else {
      stopScanning();
    }
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check if QrScanner is supported
      if (!QrScanner.hasCamera()) {
        setError('No camera found on this device.');
        setIsScanning(false);
        return;
      }

      // Get camera permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      });

      setHasPermission(true);

      if (videoRef.current) {
        // Create QR Scanner instance
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            if (result && result.data && result.data !== lastScannedRef.current) {
              lastScannedRef.current = result.data;
              handleQRCodeDetected(result.data);
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            overlay: undefined, // We'll create our own overlay
            maxScansPerSecond: 10,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            supportedScanTypes: [
              QrScanner.SCAN_TYPE_CAMERA
            ]
          }
        );

        // Start scanning
        await qrScannerRef.current.start();
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Scanner initialization error:', err);
      setHasPermission(false);
      setError('Camera access denied. Please allow camera permissions and try again.');
      setIsScanning(false);
    }
  };

  const handleQRCodeDetected = (qrData: string) => {
    console.log('QR Code detected:', qrData);
    const appointmentId = extractAppointmentId(qrData);
    
    if (appointmentId) {
      console.log('Extracted appointment ID:', appointmentId);
      stopScanning();
      onScanSuccess(appointmentId);
      toast({
        title: "QR Code Scanned",
        description: `Found appointment ID: ${appointmentId.slice(0, 8)}...`,
      });
    } else {
      console.log('No valid appointment ID found in QR data');
      // If no valid appointment ID found, show error but continue scanning
      toast({
        title: "Invalid QR Code",
        description: `The scanned QR code doesn't contain a valid appointment ID. Raw data: ${qrData.substring(0, 50)}...`,
        variant: "destructive"
      });
      // Reset last scanned to allow retrying the same code
      lastScannedRef.current = null;
    }
  };

  const extractAppointmentId = (qrData: string): string | null => {
    // Try multiple formats for QR code data
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(qrData);
      return parsed.appointment_id || parsed.appointmentId || parsed.id || null;
    } catch {
      // If not JSON, try different formats
      
      // Check if it's a UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(qrData)) {
        return qrData;
      }
      
      // Check if it's a URL with appointment ID
      try {
        const url = new URL(qrData);
        const appointmentId = url.searchParams.get('appointment_id') || 
                             url.searchParams.get('id') || 
                             url.pathname.split('/').pop();
        if (appointmentId && uuidRegex.test(appointmentId)) {
          return appointmentId;
        }
      } catch {
        // Not a valid URL
      }
      
      // Check if it's just a plain text appointment ID (without dashes)
      const plainIdRegex = /^[0-9a-f]{32}$/i;
      if (plainIdRegex.test(qrData)) {
        // Convert to UUID format
        return `${qrData.slice(0, 8)}-${qrData.slice(8, 12)}-${qrData.slice(12, 16)}-${qrData.slice(16, 20)}-${qrData.slice(20, 32)}`;
      }
      
      // Check for base64 encoded data
      try {
        const decoded = atob(qrData);
        const decodedAppointmentId = extractAppointmentId(decoded);
        if (decodedAppointmentId) {
          return decodedAppointmentId;
        }
      } catch {
        // Not base64
      }
      
      // Check if it contains appointment ID in any format
      const appointmentIdMatch = qrData.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (appointmentIdMatch) {
        return appointmentIdMatch[0];
      }
      
      // Check for 32-character hex string anywhere in the data
      const plainIdMatch = qrData.match(/[0-9a-f]{32}/i);
      if (plainIdMatch) {
        const plainId = plainIdMatch[0];
        return `${plainId.slice(0, 8)}-${plainId.slice(8, 12)}-${plainId.slice(12, 16)}-${plainId.slice(16, 20)}-${plainId.slice(20, 32)}`;
      }
      
      return null;
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    lastScannedRef.current = null;

    // Stop QR Scanner
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  const handleRetry = () => {
    setError(null);
    setHasPermission(null);
    lastScannedRef.current = null;
    stopScanning();
    initializeScanner();
  };



  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" />
            QR Code Scanner
          </DialogTitle>
          <DialogDescription className="text-sm">
            Position the QR code within the camera frame to scan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-4 h-4 bg-red-200 rounded-full flex items-center justify-center mt-0.5">
                  <X className="h-2.5 w-2.5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    className="text-xs h-7"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {hasPermission === null && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <div className="relative">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>

                </div>
                <p className="text-sm text-muted-foreground">Initializing camera...</p>
              </div>
            </div>
          )}

          {/* Video Scanner */}
          <div className={`relative ${hasPermission && !error ? 'block' : 'hidden'}`}>
            <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-black">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
                autoPlay
                controls={false}
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  {/* Scanning frame */}
                  <div className="w-48 h-48 border-2 border-white/60 rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg"></div>
                    
                    {/* Scanning line */}
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Center dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-xs rounded-full">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                  {isScanning ? 'Scanning' : 'Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1 h-9"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            
            {hasPermission && (
              <Button 
                onClick={handleRetry} 
                className="flex-1 h-9"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Restart
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Ensure QR code is well-lit and clearly visible
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};