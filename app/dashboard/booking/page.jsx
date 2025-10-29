'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import {
  Eye, Search, ArrowUpDown, MapPin, Calendar, User, Car, MoreVertical, 
  Filter, RefreshCw, Navigation, DollarSign, X
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
import Pagination from "@/components/ui/pagination";
import { usePagination } from "../../lib/hooks/usePagination";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Table filtering states
  const [tableFilters, setTableFilters] = useState({
    driverId: '',
    riderId: '',
    status: '',
    pickupLabel: '',
    dropoffLabel: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // Pagination hook with same configuration as drivers page
  const pagination = usePagination(filteredBookings, {
    initialItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 20, 50],
    resetPageOnDataChange: true
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyTableFilters();
  }, [bookings, tableFilters, sortConfig]);

  // Apply table-specific filters
  const applyTableFilters = () => {
    let filtered = [...bookings];

    // Apply filters
    if (tableFilters.driverId) {
      filtered = filtered.filter(booking =>
        booking.driverId?.toLowerCase().includes(tableFilters.driverId.toLowerCase())
      );
    }

    if (tableFilters.riderId) {
      filtered = filtered.filter(booking =>
        booking.riderId?.toLowerCase().includes(tableFilters.riderId.toLowerCase())
      );
    }

    if (tableFilters.status) {
      filtered = filtered.filter(booking =>
        booking.status?.toLowerCase().includes(tableFilters.status.toLowerCase())
      );
    }

    if (tableFilters.pickupLabel) {
      filtered = filtered.filter(booking =>
        booking.pickup?.label?.toLowerCase().includes(tableFilters.pickupLabel.toLowerCase())
      );
    }

    if (tableFilters.dropoffLabel) {
      filtered = filtered.filter(booking =>
        booking.dropoff?.label?.toLowerCase().includes(tableFilters.dropoffLabel.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'createdAt') {
          aValue = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
          bValue = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
        } else if (sortConfig.key === 'farePerKm') {
          aValue = a.dropoff?.farePerKm || 0;
          bValue = b.dropoff?.farePerKm || 0;
        } else {
          aValue = aValue || '';
          bValue = bValue || '';
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

    setFilteredBookings(filtered);
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

  // Clear all filters
  const clearAllFilters = () => {
    setTableFilters({
      driverId: '',
      riderId: '',
      status: '',
      pickupLabel: '',
      dropoffLabel: ''
    });
  };

  // Fetch bookings from Firestore
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Fetched bookings:', bookingsData);
      setBookings(bookingsData);
      setFilteredBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
    setLoading(false);
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // View booking details
  const viewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  // Actions Dropdown
  const ActionsDropdown = ({ booking }) => {
    const [isOpen, setIsOpen] = useState(false);

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
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    viewBookingDetails(booking);
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-3" />
                  View Details
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
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header Section - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bookings Management</h1>
          <p className="text-gray-600 mt-1">Manage all ride bookings in the system</p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Summary Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Bookings</CardTitle>
            <Car className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{bookings.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Requested</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'requested').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Distance</CardTitle>
            <Navigation className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {bookings.reduce((sum, b) => sum + (parseFloat(b.tripKm) || 0), 0).toFixed(1)} km
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table - Responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-lg sm:text-xl">All Bookings ({filteredBookings.length})</span>
            {(tableFilters.driverId || tableFilters.riderId || tableFilters.status || tableFilters.pickupLabel || tableFilters.dropoffLabel) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 self-start sm:self-center"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </CardTitle>
          <CardDescription>
            Complete list of ride bookings with filtering capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] sm:w-[180px]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span className="text-xs sm:text-sm">Created At</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                  </TableHead>
                  
                  <TableHead className="min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm">Driver ID</span>
                    </div>
                    <div className="mt-2 hidden sm:block">
                      <input
                        type="text"
                        placeholder="Search driver..."
                        value={tableFilters.driverId}
                        onChange={(e) => handleTableFilterChange('driverId', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead className="min-w-[120px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm">Rider ID</span>
                    </div>
                    <div className="mt-2 hidden sm:block">
                      <input
                        type="text"
                        placeholder="Search rider..."
                        value={tableFilters.riderId}
                        onChange={(e) => handleTableFilterChange('riderId', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead className="min-w-[140px] hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm">Pickup Location</span>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search pickup..."
                        value={tableFilters.pickupLabel}
                        onChange={(e) => handleTableFilterChange('pickupLabel', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead className="min-w-[140px] hidden md:table-cell">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm">Dropoff Location</span>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search dropoff..."
                        value={tableFilters.dropoffLabel}
                        onChange={(e) => handleTableFilterChange('dropoffLabel', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead className="hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('tripKm')}
                      className="flex items-center space-x-1 text-left hover:text-blue-600"
                    >
                      <span className="text-xs sm:text-sm">Distance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  
                  <TableHead className="hidden lg:table-cell">
                    <button
                      onClick={() => handleSort('farePerKm')}
                      className="flex items-center space-x-1 text-left hover:text-blue-600"
                    >
                      <span className="text-xs sm:text-sm">Fare/Km</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm">Status</span>
                    </div>
                    <div className="mt-2 hidden sm:block">
                      <select
                        value={tableFilters.status}
                        onChange={(e) => handleTableFilterChange('status', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="requested">Requested</option>
                        <option value="accepted">Accepted</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </TableHead>
                  
                  <TableHead className="text-right w-[60px]">
                    <span className="text-xs sm:text-sm">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedData.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-muted/50">
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <span className="text-xs sm:text-sm">
                          {formatDate(booking.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                        <span className="text-xs sm:text-sm font-mono">
                          {booking.driverId ? booking.driverId.substring(0, 6) + '...' : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                        <span className="text-xs sm:text-sm font-mono">
                          {booking.riderId ? booking.riderId.substring(0, 6) + '...' : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                        <span className="text-xs sm:text-sm max-w-[120px] sm:max-w-[200px] truncate">
                          {booking.pickup?.label || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                        <span className="text-xs sm:text-sm max-w-[120px] sm:max-w-[200px] truncate">
                          {booking.dropoff?.label || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Navigation className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                        <span className="text-xs sm:text-sm font-medium">
                          {booking.tripKm ? `${parseFloat(booking.tripKm).toFixed(1)} km` : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                        <span className="text-xs sm:text-sm font-medium">
                          {formatCurrency(booking.dropoff?.farePerKm)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-2 sm:p-4">
                      <span className={`inline-block px-1 sm:px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status || 'Unknown'}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right p-2 sm:p-4">
                      <ActionsDropdown booking={booking} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination Controls - Same as Drivers Page */}
          {filteredBookings.length > 0 && (
            <Pagination
              {...pagination.paginationProps}
              className="mt-4"
              showItemsPerPage={true}
              showPageInfo={true}
              showPageNumbers={true}
              maxPageNumbers={5}
            />
          )}
          
          {filteredBookings.length === 0 && !loading && (
            <div className="text-center py-8">
              <Car className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2 text-sm sm:text-base">
                {bookings.length === 0 ? 'No bookings found in the database' : 'No bookings found matching your filters'}
              </p>
              {(tableFilters.driverId || tableFilters.riderId || tableFilters.status || tableFilters.pickupLabel || tableFilters.dropoffLabel) && (
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Filters Section - Show on small screens */}
      <Card className="sm:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="text"
            placeholder="Search driver..."
            value={tableFilters.driverId}
            onChange={(e) => handleTableFilterChange('driverId', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Search rider..."
            value={tableFilters.riderId}
            onChange={(e) => handleTableFilterChange('riderId', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Search pickup location..."
            value={tableFilters.pickupLabel}
            onChange={(e) => handleTableFilterChange('pickupLabel', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Search dropoff location..."
            value={tableFilters.dropoffLabel}
            onChange={(e) => handleTableFilterChange('dropoffLabel', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={tableFilters.status}
            onChange={(e) => handleTableFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

      {/* Booking Details Modal - Responsive */}
      {showDetails && selectedBooking && (
        <div 
          className="fixed bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            margin: 0,
            padding: '8px'
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-full sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-bold">Booking Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Booking Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="w-4 h-4" />
                      Booking Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><strong>Booking ID:</strong> <span className="break-all">{selectedBooking.id}</span></div>
                    <div><strong>Created At:</strong> {formatDate(selectedBooking.createdAt)}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                    <div><strong>Trip Distance:</strong> {selectedBooking.tripKm ? `${parseFloat(selectedBooking.tripKm).toFixed(1)} km` : 'N/A'}</div>
                    <div><strong>Fare Per Km:</strong> {formatCurrency(selectedBooking.dropoff?.farePerKm)}</div>
                  </CardContent>
                </Card>

                {/* Pickup Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-4 h-4 text-green-500" />
                      Pickup Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><strong>Address:</strong> <span className="break-words">{selectedBooking.pickup?.label || 'N/A'}</span></div>
                    <div><strong>Latitude:</strong> {selectedBooking.pickup?.lat || 'N/A'}</div>
                    <div><strong>Longitude:</strong> {selectedBooking.pickup?.lng || 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Dropoff Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Dropoff Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><strong>Address:</strong> <span className="break-words">{selectedBooking.dropoff?.label || 'N/A'}</span></div>
                    <div><strong>Latitude:</strong> {selectedBooking.dropoff?.lat || 'N/A'}</div>
                    <div><strong>Longitude:</strong> {selectedBooking.dropoff?.lng || 'N/A'}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Driver Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-4 h-4 text-blue-500" />
                      Driver Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><strong>Driver ID:</strong> <span className="break-all">{selectedBooking.driverId || 'N/A'}</span></div>
                  </CardContent>
                </Card>

                {/* Rider Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-4 h-4 text-green-500" />
                      Rider Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><strong>Rider ID:</strong> <span className="break-all">{selectedBooking.riderId || 'N/A'}</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
