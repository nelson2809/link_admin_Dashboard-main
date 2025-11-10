'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import toast, { Toaster } from 'react-hot-toast';
import {
  Eye, Download, FileText, Car, CheckCircle, XCircle, Clock, User, MoreVertical, 
  Filter, Search, ArrowUpDown, X, ZoomIn, ZoomOut, AlertTriangle, FilterX
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ADDED: Pagination imports
import Pagination from "@/components/ui/pagination";
import { usePagination } from "../../lib/hooks/usePagination";

export default function DriversAdminPage() {
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  
  // Build display code map for drivers in current dataset
  const driverCodeMap = useMemo(() => {
    const ids = Array.from(new Set(drivers.map(d => d.id).filter(Boolean)));
    ids.sort();
    const map = {};
    ids.forEach((id, idx) => {
      map[id] = `DRIVER${String(idx + 1).padStart(3, '0')}`;
    });
    return map;
  }, [drivers]);
  
  // Document viewer states - Updated for smaller modal
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentZoom, setDocumentZoom] = useState(1);
  
  // KYC Rejection Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState(null);
  const [modalCloseCallback, setModalCloseCallback] = useState(null);
  
  // Table filtering states
  const [tableFilters, setTableFilters] = useState({
    name: '',
    code: '',
    vehicle: '',
    kycStatus: '',
    vehicleStatus: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // ADDED: Pagination hook
  const pagination = usePagination(filteredDrivers, {
    initialItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 20, 50],
    resetPageOnDataChange: true
  });
  
  useEffect(() => {
    fetchDriversWithKycAndVehicles();
  }, []);

  useEffect(() => {
    applyTableFilters();
  }, [drivers, tableFilters, sortConfig]);

  // Document viewer functions - Updated for smaller modal
  const openDocumentViewer = (documentUrl, documentName, documentType = 'kyc') => {
    setCurrentDocument({
      url: documentUrl,
      name: documentName,
      type: documentType
    });
    setDocumentZoom(1);
    setShowDocumentViewer(true);
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setCurrentDocument(null);
    setDocumentZoom(1);
  };

  // Updated download function for current document in viewer
  const downloadCurrentDocument = async () => {
    if (currentDocument) {
      await downloadDocument(currentDocument.url, currentDocument.name);
    }
  };

  // Enhanced notification with better styling
  const showDownloadNotification = () => {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.download-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'download-notification fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse';
    notification.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      <span class="font-medium">Download started successfully!</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease-out';
        
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);
  };

  const zoomIn = () => {
    setDocumentZoom(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setDocumentZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  // UPDATED: Clear all table filters function
  const clearAllFilters = () => {
    setTableFilters({
      name: '',
      code: '',
      vehicle: '',
      kycStatus: '',
      vehicleStatus: '',
      status: ''
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Apply table-specific filters
  const applyTableFilters = () => {
    let filtered = [...drivers];

    // Apply table filters
    if (tableFilters.name) {
      filtered = filtered.filter(driver =>
        (driver.username || driver.name || '')
          .toLowerCase()
          .includes(tableFilters.name.toLowerCase()) ||
        driver.email?.toLowerCase().includes(tableFilters.name.toLowerCase())
      );
    }

    if (tableFilters.vehicle) {
      filtered = filtered.filter(driver =>
        driver.vehicle?.brand?.toLowerCase().includes(tableFilters.vehicle.toLowerCase()) ||
        driver.vehicle?.model?.toLowerCase().includes(tableFilters.vehicle.toLowerCase()) ||
        driver.vehicle?.number?.toLowerCase().includes(tableFilters.vehicle.toLowerCase())
      );
    }

    if (tableFilters.kycStatus) {
      filtered = filtered.filter(driver => {
        const status = getKYCDisplayStatus(driver.kyc_approved, driver.kycStatus, Object.keys(driver.kycDocuments || {}).length);
        return status === tableFilters.kycStatus;
      });
    }

    if (tableFilters.vehicleStatus) {
      filtered = filtered.filter(driver => {
        if (!driver.vehicle) return false; // Only count drivers with a vehicle
        const isActive = driver.vehicleActive !== false;
        const status = isActive ? 'active' : 'inactive';
        return status === tableFilters.vehicleStatus;
      });
    }

    if (tableFilters.status) {
      filtered = filtered.filter(driver => {
        if (tableFilters.status === 'active') return driver.is_active !== false;
        if (tableFilters.status === 'inactive') return driver.is_active === false;
        return true;
      });
    }

    // Filter by Driver Code (mapped from driver.id)
    if (tableFilters.code) {
      const q = tableFilters.code.toLowerCase();
      filtered = filtered.filter(driver =>
        (driverCodeMap[driver.id] || '').toLowerCase().includes(q)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'code') {
          aValue = driverCodeMap[a.id] || '';
          bValue = driverCodeMap[b.id] || '';
        } else if (sortConfig.key === 'name') {
          aValue = a.username || a.name || '';
          bValue = b.username || b.name || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredDrivers(filtered);
  };

  // Handle external filter changes from DriversFilter component
  const handleFilterChange = (filters) => {
    let filtered = [...drivers];

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(driver =>
        (driver.username || driver.name || '')
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        driver.phone?.includes(filters.searchTerm)
      );
    }

    // Status filter (treat undefined as active to match dashboard)
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(driver => {
        if (filters.statusFilter === 'active') return driver.is_active !== false;
        if (filters.statusFilter === 'inactive') return driver.is_active === false;
        return true;
      });
    }

    // KYC filter - Updated to work with boolean system
    if (filters.kycFilter !== 'all') {
      filtered = filtered.filter(driver => {
        const status = getKYCDisplayStatus(driver.kyc_approved, driver.kycStatus, Object.keys(driver.kycDocuments || {}).length);
        return status === filters.kycFilter;
      });
    }

    // Vehicle filter - Updated for active/inactive (treat undefined as active)
    if (filters.vehicleFilter !== 'all') {
      filtered = filtered.filter(driver => {
        if (!driver.vehicle) return false; // Only include if a vehicle exists
        const isActive = driver.vehicleActive !== false;
        const status = isActive ? 'active' : 'inactive';
        return status === filters.vehicleFilter;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(driver => {
        if (!driver.createdAt) return false;
        
        const driverDate = driver.createdAt.toDate ? driver.createdAt.toDate() : new Date(driver.createdAt);
        
        switch (filters.dateRange) {
          case 'today':
            return driverDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return driverDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            return driverDate >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
            return driverDate >= quarterAgo;
          default:
            return true;
        }
      });
    }

    setFilteredDrivers(filtered);
  };

  // Handle table filter changes
  const handleTableFilterChange = (column, value) => {
    setTableFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Fetch drivers from 'users' collection with their KYC documents and vehicles
  const fetchDriversWithKycAndVehicles = async () => {
    setLoading(true);
    try {
      // Fetch all users, then filter and sort client-side to avoid dropping docs
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const driversData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const userId = userDoc.id;

          // Only include users with role 'driver'
          if (userData.role !== 'driver') {
            return null;
          }

          // 1. Fetch KYC documents from 'kyc' subcollection
          const kycQuery = collection(db, 'users', userId, 'kyc');
          const kycSnapshot = await getDocs(kycQuery);
          let kycDocuments = {};
          kycSnapshot.forEach(doc => {
            const docData = doc.data();
            kycDocuments[doc.id] = {
              url: docData.url || docData.photoUrl || docData.fileUrl || docData.documentUrl,
              uploadedAt: docData.uploadedAt || docData.createdAt,
              type: docData.type || doc.id,
              ...docData
            };
          });

          // 2. Fetch vehicle from 'vehicles' subcollection
          const vehiclesQuery = collection(db, 'users', userId, 'vehicles');
          const vehiclesSnapshot = await getDocs(vehiclesQuery);
          let vehicle = null;
          if (!vehiclesSnapshot.empty) {
            const vehicleDoc = vehiclesSnapshot.docs[0];
            vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
          }

          return {
            id: userId,
            ...userData,
            kycDocuments,
            vehicle,
          };
        })
      );

      // Filter only drivers and sort by createdAt desc client-side
      const filteredDriversData = driversData
        .filter(driver => driver !== null)
        .sort((a, b) => {
          const toDate = (v) => {
            const d = v?.toDate ? v.toDate() : new Date(v);
            return isNaN(d) ? new Date(0) : d;
          };
          const aDate = toDate(a.createdAt);
          const bDate = toDate(b.createdAt);
          return bDate - aDate; // desc
        });

      setDrivers(filteredDriversData);
      setFilteredDrivers(filteredDriversData);
    } catch (error) {
      console.error('Error fetching drivers, KYC, and vehicles:', error);
    }
    setLoading(false);
  };

  // Get KYC Display Status Based on Boolean Field and Document Count
  const getKYCDisplayStatus = (kycApproved, kycStatus, documentCount) => {
    // Explicitly handle zero-document case: show Not Submitted; never Pending
    if (documentCount === 0) {
      if (kycStatus === 'rejected' || kycApproved === false) return 'rejected';
      return 'not-submitted';
    }
    if (typeof kycApproved === 'boolean') {
      if (kycApproved) return 'verified';
      if (kycStatus === 'rejected') return 'rejected';
      return 'pending';
    }
    if (documentCount > 0 && (!kycStatus || kycStatus === 'not-submitted')) {
      return 'submitted';
    }
    return kycStatus || 'not-submitted';
  };

  // Helper: Check if all KYC documents are uploaded
  const isKycSubmissionComplete = (kycDocuments) => {
    const docs = kycDocuments ? Object.values(kycDocuments) : [];
    if (docs.length === 0) return false;
    return docs.every(doc => !!doc.url);
  };

  // Clear KYC documents for resubmission
  const clearKYCDocuments = async (driverId) => {
    try {
      // Get all KYC documents
      const kycQuery = collection(db, 'users', driverId, 'kyc');
      const kycSnapshot = await getDocs(kycQuery);
      
      // Delete each document
      const deletePromises = kycSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'users', driverId, 'kyc', docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`Cleared ${deletePromises.length} KYC documents for driver ${driverId}`);
    } catch (error) {
      console.error('Error clearing KYC documents:', error);
      throw error;
    }
  };

  // Enhanced Update KYC Status with Resubmission Support
  const updateKYCStatus = async (driverId, approved, reason = null, allowResubmission = false, showToast = true) => {
    try {
      const updateData = {
        kyc_approved: approved,
        kycStatus: approved ? 'verified' : 'rejected',
        kycVerifiedAt: approved ? new Date() : null,
        kycRejectedAt: !approved ? new Date() : null,
        updatedAt: new Date(),
      };

      if (reason && !approved) {
        updateData.kycRejectionReason = reason;
      }

      // If rejecting and allowing resubmission, clear documents
      if (!approved && allowResubmission) {
        await clearKYCDocuments(driverId);
        updateData.kycStatus = 'not-submitted';
        updateData.kyc_approved = null; // Reset to allow fresh submission
      }

      await updateDoc(doc(db, 'users', driverId), updateData);
      
      // Update local state
      const updatedDrivers = drivers.map(driver => {
        if (driver.id === driverId) {
          const updatedDriver = { ...driver, ...updateData };
          // If documents were cleared, update the local kycDocuments
          if (!approved && allowResubmission) {
            updatedDriver.kycDocuments = {};
          }
          return updatedDriver;
        }
        return driver;
      });
      setDrivers(updatedDrivers);
      
      setFilteredDrivers(prevFiltered =>
        prevFiltered.map(driver => {
          if (driver.id === driverId) {
            const updatedDriver = { ...driver, ...updateData };
            if (!approved && allowResubmission) {
              updatedDriver.kycDocuments = {};
            }
            return updatedDriver;
          }
          return driver;
        })
      );

      const actionText = approved ? 'approved' : (allowResubmission ? 'rejected (resubmission allowed)' : 'rejected');
      console.log(`KYC ${actionText} successfully for driver ${driverId}`);
      
      // Only show toast if explicitly requested (for direct button clicks, not modal workflow)
      if (showToast) {
        toast.success(`KYC ${actionText} successfully!`, {
          duration: 4000,
          position: 'top-right',
          style: {
            background: approved ? '#10B981' : '#EF4444',
            color: '#fff',
            fontWeight: '500',
          },
          icon: approved ? '✅' : '❌',
        });
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast.error('Error updating KYC status. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  };

  // Enhanced Reject KYC with Custom Modals
  const handleKYCRejection = (driverId, closeModal = null) => {
    setCurrentDriverId(driverId);
    setModalCloseCallback(() => closeModal);
    setRejectionReason('');
    setAllowResubmission(false);
    setShowRejectModal(true);
  };

  const handleRejectModalSubmit = () => {
    setShowRejectModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmRejection = async () => {
    setShowConfirmModal(false);
    
    try {
      // Pass showToast = false to prevent duplicate toast from updateKYCStatus
      await updateKYCStatus(currentDriverId, false, rejectionReason, allowResubmission, false);
      
      // Show success toast instead of modal
      if (allowResubmission) {
        toast.success('KYC rejected (resubmission allowed) successfully!', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '500',
          },
          icon: '✅',
        });
      } else {
        toast.success('KYC rejected successfully!', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#EF4444',
            color: '#fff',
            fontWeight: '500',
          },
          icon: '❌',
        });
      }
      
      // Reset modal states
      resetModalStates();
      
      if (modalCloseCallback) {
        modalCloseCallback();
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      toast.error('Failed to reject KYC. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  };

  const resetModalStates = () => {
    setShowRejectModal(false);
    setShowConfirmModal(false);
    setRejectionReason('');
    setAllowResubmission(false);
    setCurrentDriverId(null);
    setModalCloseCallback(null);
  };

  // Toggle driver status
  const setDriverStatus = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', driverId), {
        is_active: newStatus,
        updatedAt: new Date(),
      });
      const updatedDrivers = drivers.map(driver =>
        driver.id === driverId ? { ...driver, is_active: newStatus } : driver
      );
      setDrivers(updatedDrivers);
      
      setFilteredDrivers(prevFiltered => 
        prevFiltered.map(driver =>
          driver.id === driverId ? { ...driver, is_active: newStatus } : driver
        )
      );

      toast.success(`Driver ${newStatus ? 'activated' : 'deactivated'} successfully!`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: newStatus ? '#10B981' : '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: newStatus ? '✅' : '❌',
      });
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast.error('Error updating driver status. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  };

  // Update vehicle status (Active/Inactive)
  const updateVehicleStatus = async (driverId, isActive) => {
    try {
      const updateData = {
        vehicleActive: isActive,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'users', driverId), updateData);
      
      const updatedDrivers = drivers.map(driver =>
        driver.id === driverId ? { ...driver, ...updateData } : driver
      );
      setDrivers(updatedDrivers);
      
      setFilteredDrivers(prevFiltered =>
        prevFiltered.map(driver =>
          driver.id === driverId ? { ...driver, ...updateData } : driver
        )
      );

      console.log(`Vehicle ${isActive ? 'activated' : 'deactivated'} successfully for driver ${driverId}`);
      
      toast.success(`Vehicle ${isActive ? 'activated' : 'deactivated'} successfully!`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: isActive ? '#10B981' : '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: isActive ? '✅' : '❌',
      });
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast.error('Error updating vehicle status. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  };

  // UPDATED: Enhanced download function using API proxy
  const downloadDocument = async (url, filename) => {
    if (!url) {
      toast.error('No document URL available', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
      return;
    }

    try {
      // Use the API proxy route to download the file
      const proxyUrl = `/api/download-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = filename;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      // Show success notification
      showDownloadNotification();
      
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Download failed. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '❌',
      });
    }
  };

  // Format date for display (dd/mm/yy)
  const formatDateDdMmYy = (timestamp) => {
    if (!timestamp) return 'N/A';
    const dateObj = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(dateObj.getTime())) return 'N/A';
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Enhanced Status Badge with Boolean Support
  const getStatusBadge = (kycApproved, kycStatus, documentCount = 0) => {
    const displayStatus = getKYCDisplayStatus(kycApproved, kycStatus, documentCount);
    
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, text: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, text: 'Rejected' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, text: 'Pending' },
      submitted: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText, text: 'Submitted' },
      incomplete: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: FileText, text: 'Incomplete' },
      'not-submitted': { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: FileText, text: 'Not Submitted' }
    };
    
    const config = statusConfig[displayStatus] || statusConfig['not-submitted'];
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // Vehicle Status Badge
  const getVehicleStatusBadge = (isActive) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: CheckCircle, 
        text: 'Active'
      },
      inactive: { 
        color: 'bg-gray-100 text-gray-500 border-gray-200', 
        icon: XCircle, 
        text: 'Inactive'
      }
    };
    
    const status = isActive ? 'active' : 'inactive';
    const config = statusConfig[status];
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // Enhanced KYC Status Badge with Document Count
  const getKYCStatusBadgeWithCount = (status, documentCount, driver) => {
    const displayStatus = getKYCDisplayStatus(driver.kyc_approved, status, documentCount);
    
    const statusConfig = {
      verified: { 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: CheckCircle, 
        text: 'Verified',
        countColor: 'text-green-600'
      },
      rejected: { 
        color: 'bg-red-100 text-red-700 border-red-200', 
        icon: XCircle, 
        text: 'Rejected',
        countColor: 'text-red-600'
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
        icon: Clock, 
        text: 'Pending',
        countColor: 'text-yellow-600'
      },
      submitted: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: FileText,
        text: 'Submitted',
        countColor: 'text-blue-600'
      },
      incomplete: { 
        color: 'bg-orange-100 text-orange-700 border-orange-200', 
        icon: FileText, 
        text: 'Incomplete',
        countColor: 'text-orange-600'
      },
      'not-submitted': { 
        color: 'bg-gray-100 text-gray-500 border-gray-200', 
        icon: FileText, 
        text: 'Not Submitted',
        countColor: 'text-gray-500'
      }
    };
    
    const config = statusConfig[displayStatus] || statusConfig['not-submitted'];
    const IconComponent = config.icon;
    
    return (
      <div className="space-y-2">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${config.color}`}>
          <IconComponent className="w-3 h-3" />
          {config.text}
        </span>
        {documentCount > 0 && (
          <p className={`text-xs font-medium ${config.countColor}`}>
            KYC Documents ({documentCount})
          </p>
        )}
      </div>
    );
  };

  // Show modal
  const viewDocuments = (driver) => {
    setSelectedDriver(driver);
    setShowDocuments(true);
  };

  // Format document name for display
  const formatDocumentName = (docId) => {
    return docId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Id', 'ID');
  };

  // Enhanced Actions Dropdown
  const ActionsDropdown = ({ driver }) => {
    const [isOpen, setIsOpen] = useState(false);
    const displayStatus = getKYCDisplayStatus(driver.kyc_approved, driver.kycStatus, Object.keys(driver.kycDocuments || {}).length);
    const hasPendingKYC = Object.keys(driver.kycDocuments || {}).length > 0 && displayStatus !== 'verified';

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    viewDocuments(driver);
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-3" />
                  View Details & Documents
                </button>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                {/* KYC Actions */}
                {displayStatus !== 'verified' && (
                  <>
                    {isKycSubmissionComplete(driver.kycDocuments) ? (
                      <button
                        onClick={() => {
                          updateKYCStatus(driver.id, true);
                          setIsOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-3" />
                        ✓ Verify KYC (Approve)
                      </button>
                    ) : (
                      <div className="flex items-center w-full px-4 py-2 text-sm text-orange-700">
                        <Clock className="w-4 h-4 mr-3" />
                        Document submission pending
                      </div>
                    )}
                    {displayStatus !== 'rejected' ? (
                      <button
                        onClick={() => {
                          handleKYCRejection(driver.id, () => setIsOpen(false));
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4 mr-3" />
                        ✗ Reject KYC
                      </button>
                    ) : (
                      <div className="flex items-center w-full px-4 py-2 text-sm text-gray-500">
                        <XCircle className="w-4 h-4 mr-3" />
                        Already rejected
                      </div>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                
                {/* Vehicle Actions */}
                {driver.vehicle && (
                  <>
                    <button
                      onClick={() => {
      updateVehicleStatus(driver.id, !(driver.vehicleActive === true));
                        setIsOpen(false);
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                        driver.vehicleActive !== false
                          ? 'text-red-700 hover:bg-red-50' 
                          : 'text-green-700 hover:bg-green-50'
                      }`}
                    >
      {driver.vehicleActive !== false ? (
        <>
          <XCircle className="w-4 h-4 mr-3" />
          Deactivate Vehicle
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 mr-3" />
                          Activate Vehicle
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                
                <button
                  onClick={() => {
                    setDriverStatus(driver.id, !driver.is_active);
                    setIsOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                    driver.is_active 
                      ? 'text-red-700 hover:bg-red-50' 
                      : 'text-green-700 hover:bg-green-50'
                  }`}
                >
                  {driver.is_active ? (
                    <>
                      <XCircle className="w-4 h-4 mr-3" />
                      Deactivate Driver
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-3" />
                      Activate Driver
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Add Toaster component */}
      <Toaster />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Drivers Management</h1>
          <p className="text-gray-600 mt-1">Manage driver registrations, KYC verification, and vehicle approvals</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{drivers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {drivers.filter(d => getKYCDisplayStatus(d.kyc_approved, d.kycStatus, Object.keys(d.kycDocuments || {}).length) === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => getKYCDisplayStatus(d.kyc_approved, d.kycStatus, Object.keys(d.kycDocuments || {}).length) === 'verified').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {drivers.filter(d => d.is_active).length}
            </div>
          </CardContent>
        </Card>

        {/* Added: KYC Rejected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {drivers.filter(d => getKYCDisplayStatus(d.kyc_approved, d.kycStatus, Object.keys(d.kycDocuments || {}).length) === 'rejected').length}
            </div>
          </CardContent>
        </Card>

        {/* Added: Active Vehicles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => d.vehicle && d.vehicleActive !== false).length}
            </div>
          </CardContent>
        </Card>

        {/* Added: Inactive Vehicles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Vehicles</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {drivers.filter(d => d.vehicle && d.vehicleActive === false).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Table with In-Table Filters and Clear All Button */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Drivers ({filteredDrivers.length})</CardTitle>
              <CardDescription>
                Complete list of registered drivers with their verification status
              </CardDescription>
            </div>
            {/* Show Clear Filters only when any table filter is active, styled like Bookings page */}
            {(tableFilters.name || tableFilters.vehicle || tableFilters.kycStatus || tableFilters.vehicleStatus || tableFilters.status) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 self-start sm:self-center"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Driver</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search drivers..."
                          value={tableFilters.name}
                          onChange={(e) => handleTableFilterChange('name', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </TableHead>

                  <TableHead className="w-[160px]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('code')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Driver Code</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search code..."
                          value={tableFilters.code}
                          onChange={(e) => handleTableFilterChange('code', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Vehicle</span>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search vehicles..."
                        value={tableFilters.vehicle}
                        onChange={(e) => handleTableFilterChange('vehicle', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>KYC Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.kycStatus}
                        onChange={(e) => handleTableFilterChange('kycStatus', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All KYC</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                        <option value="submitted">Submitted</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Vehicle Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.vehicleStatus}
                        onChange={(e) => handleTableFilterChange('vehicleStatus', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Vehicles</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Joined</span>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                    </div>
                    <div className="mt-2">
                      <select
                        value={tableFilters.status}
                        onChange={(e) => handleTableFilterChange('status', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* UPDATED: Show empty state when no data matches filters */}
                {pagination.paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-gray-500">
                        <p className="text-sm font-medium">No Drivers found matching your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedData.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {driver.photoUrl ? (
                            <img
                              src={driver.photoUrl}
                              alt={driver.username || driver.name || 'Driver'}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {driver.username || driver.name || 'Unnamed Driver'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {driver.email}
                            </p>
                            {driver.phone && (
                              <p className="text-xs text-muted-foreground">
                                {driver.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-xs">
                        {driverCodeMap[driver.id] || 'N/A'}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-2">
                          {driver.vehicle ? (
                            <>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {driver.vehicle.brand} {driver.vehicle.model}
                                </p>
                                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {driver.vehicle.category}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {driver.vehicle.number}
                                </p>
                              </div>
      {getVehicleStatusBadge(driver.vehicleActive !== false)}
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Car className="h-4 w-4" />
                              <span className="text-sm">No vehicle</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-2">
                          {getKYCStatusBadgeWithCount(
                            driver.kycStatus || 'not-submitted', 
                            Object.keys(driver.kycDocuments || {}).length,
                            driver
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-2">
                          {driver.vehicle ? (
      getVehicleStatusBadge(driver.vehicleActive !== false)
                          ) : (
                            <span className="text-xs text-gray-500">No vehicle</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <p className="text-sm">
                          {driver.createdAt
                            ? formatDateDdMmYy(driver.createdAt)
                            : driver.addedAt ? formatDateDdMmYy(driver.addedAt) : '—'}
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
                          driver.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {driver.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <ActionsDropdown driver={driver} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* ADDED: Pagination Component */}
            {filteredDrivers.length > 0 && (
              <Pagination
                {...pagination.paginationProps}
                className="mt-4"
                showItemsPerPage={true}
                showPageInfo={true}
                showPageNumbers={true}
                maxPageNumbers={5}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Document Viewer Modal */}
      {showDocuments && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Driver Details - {selectedDriver.username || selectedDriver.name}</h2>
              <button
                onClick={() => setShowDocuments(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Driver Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-center mb-4">
                    {selectedDriver.photoUrl ? (
                      <img
                        src={selectedDriver.photoUrl}
                        alt={selectedDriver.username || selectedDriver.name || 'Driver'}
                        className="w-24 h-24 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div><strong>Name:</strong> {selectedDriver.username || selectedDriver.name || 'Not provided'}</div>
                  <div><strong>Email:</strong> {selectedDriver.email || 'Not provided'}</div>
                  <div><strong>Phone:</strong> {selectedDriver.phone || 'Not provided'}</div>
                  <div><strong>UID:</strong> {selectedDriver.uid || 'Not provided'}</div>
                  <div><strong>Username:</strong> {selectedDriver.username || 'Not provided'}</div>
                  <div>
                    <strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      selectedDriver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedDriver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <strong>KYC Status:</strong>
                    <span className="ml-2">
                      {getStatusBadge(
                        selectedDriver.kyc_approved, 
                        selectedDriver.kycStatus, 
                        Object.keys(selectedDriver.kycDocuments || {}).length
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selectedDriver.vehicle ? (
                    <>
                      {selectedDriver.vehicle.photoUrl && (
                        <div className="flex justify-center mb-4">
                          <img
                            src={selectedDriver.vehicle.photoUrl}
                            alt="Vehicle"
                            className="w-24 h-16 object-cover border rounded cursor-pointer hover:opacity-80"
                              onClick={() => openDocumentViewer(
                                selectedDriver.vehicle.photoUrl, 
                                `${selectedDriver.username || selectedDriver.name}_vehicle_photo`, 
                                'vehicle'
                              )}
                          />
                        </div>
                      )}
                      <div><strong>Brand:</strong> {selectedDriver.vehicle.brand}</div>
                      <div><strong>Model:</strong> {selectedDriver.vehicle.model}</div>
                      <div><strong>Category:</strong> {selectedDriver.vehicle.category}</div>
                      <div><strong>Type:</strong> {selectedDriver.vehicle.type}</div>
                      <div><strong>Number:</strong> {selectedDriver.vehicle.number}</div>
                      
                      <div>
                        <strong>Vehicle Status:</strong>
                        <span className="ml-2">
      {getVehicleStatusBadge(selectedDriver.vehicleActive !== false)}
                        </span>
                      </div>

                      {selectedDriver.vehicle.documentUrl && (
                        <div className="mt-4">
                          <strong>Vehicle Document:</strong>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => openDocumentViewer(
                                selectedDriver.vehicle.documentUrl, 
                                `${selectedDriver.username || selectedDriver.name}_vehicle_document`, 
                                'vehicle'
                              )}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Document
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                downloadDocument(
                                  selectedDriver.vehicle.documentUrl,
                                  `${selectedDriver.username || selectedDriver.name}_Vehicle_Document`
                                );
                              }}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                              type="button"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No vehicle information available</p>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced KYC Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    KYC Documents {Object.keys(selectedDriver.kycDocuments || {}).length > 0 && `(${Object.keys(selectedDriver.kycDocuments || {}).length})`}
                    <span className="ml-2">
                      {getStatusBadge(
                        selectedDriver.kyc_approved, 
                        selectedDriver.kycStatus, 
                        Object.keys(selectedDriver.kycDocuments || {}).length
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDriver.kycDocuments && Object.keys(selectedDriver.kycDocuments).length > 0 ? (
                      Object.entries(selectedDriver.kycDocuments).map(([docType, docData]) => (
                        <div key={docType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex-1">
                            <span className="text-sm font-medium block">{formatDocumentName(docType)}</span>
                            <span className={`text-xs ${
                              docData.url ? 'text-green-600' : 'text-red-500'
                            }`}>
                              {docData.url ? '✅ Submitted' : '❌ Not uploaded'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {docData.url ? (
                              <>
                                <button
                                    onClick={() => openDocumentViewer(
                                      docData.url, 
                                      `${selectedDriver.username || selectedDriver.name}_${docType}`, 
                                      'kyc'
                                    )}
                                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    downloadDocument(
                                      docData.url,
                                      `${selectedDriver.username || selectedDriver.name}_${docType}_KYC`
                                    );
                                  }}
                                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1 transition-colors"
                                  type="button"
                                  disabled={!docData.url}
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 px-3 py-1 bg-gray-200 rounded">No file</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No KYC documents submitted</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              {getKYCDisplayStatus(selectedDriver.kyc_approved, selectedDriver.kycStatus, Object.keys(selectedDriver.kycDocuments || {}).length) !== 'verified' && (
                <div className="flex gap-2">
                  {isKycSubmissionComplete(selectedDriver.kycDocuments) ? (
                    <button
                      onClick={() => {
                        updateKYCStatus(selectedDriver.id, true);
                        setShowDocuments(false);
                      }}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve KYC
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-sm text-orange-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Document submission pending
                    </span>
                  )}
                  {getKYCDisplayStatus(selectedDriver.kyc_approved, selectedDriver.kycStatus, Object.keys(selectedDriver.kycDocuments || {}).length) !== 'rejected' ? (
                    <button
                      onClick={() => {
                        handleKYCRejection(selectedDriver.id, () => setShowDocuments(false));
                      }}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject KYC
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Already rejected
                    </span>
                  )}
                </div>
              )}
              
              {selectedDriver.vehicle && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
      updateVehicleStatus(selectedDriver.id, !(selectedDriver.vehicleActive === true));
                      setShowDocuments(false);
                    }}
                    className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      selectedDriver.vehicleActive !== false
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
      {selectedDriver.vehicleActive !== false ? (
        <>
          <XCircle className="w-4 h-4" />
          Deactivate Vehicle
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
                        Activate Vehicle
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowDocuments(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small Document Viewer Modal - Updated for smaller size */}
      {showDocumentViewer && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-2xl max-h-[80vh] w-full mx-4 flex flex-col">
            {/* Header - Compact */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-t-lg border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800 truncate">
                  {formatDocumentName(currentDocument.name)}
                </h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {currentDocument.type.toUpperCase()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={zoomOut}
                    className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-xs"
                    disabled={documentZoom <= 0.5}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-gray-600 min-w-[40px] text-center">
                    {Math.round(documentZoom * 100)}%
                  </span>
                  <button
                    onClick={zoomIn}
                    className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors text-xs"
                    disabled={documentZoom >= 3}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadCurrentDocument();
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1 transition-colors text-xs"
                  type="button"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
                <button
                  onClick={closeDocumentViewer}
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Document Content - Scrollable */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-100">
              <div className="max-w-full max-h-full flex items-center justify-center">
                {currentDocument.url.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={currentDocument.url}
                    className="border-0 bg-white shadow-lg rounded"
                    style={{ 
                      width: `${400 * documentZoom}px`,
                      height: `${500 * documentZoom}px`,
                      minWidth: '300px',
                      minHeight: '400px'
                    }}
                    title="Document Viewer"
                  />
                ) : (
                  <img
                    src={currentDocument.url}
                    alt={currentDocument.name}
                    className="max-w-full max-h-full object-contain shadow-lg rounded bg-white"
                    style={{ 
                      transform: `scale(${documentZoom})`,
                      transformOrigin: 'center center',
                      maxWidth: '500px',
                      maxHeight: '400px'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom KYC Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Reject KYC Documents
                  </h3>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection (optional):
                </label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Allow driver to resubmit documents?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resubmission"
                      value="yes"
                      checked={allowResubmission === true}
                      onChange={() => setAllowResubmission(true)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      <span className="font-medium text-green-600">Yes:</span> Clear existing documents and allow resubmission
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resubmission"
                      value="no"
                      checked={allowResubmission === false}
                      onChange={() => setAllowResubmission(false)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      <span className="font-medium text-red-600">No:</span> Keep documents but mark as rejected
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={resetModalStates}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectModalSubmit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm KYC Rejection
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">
                  You are about to reject this driver's KYC documents with the following settings:
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Reason:</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {rejectionReason || 'No reason provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Resubmission:</span>
                    <span className={`text-sm ml-2 font-medium ${allowResubmission ? 'text-green-600' : 'text-red-600'}`}>
                      {allowResubmission ? 'Allowed (documents will be cleared)' : 'Not allowed (documents kept)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2"
                >
                  Go Back
                </Button>
                <Button
                  onClick={handleConfirmRejection}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
