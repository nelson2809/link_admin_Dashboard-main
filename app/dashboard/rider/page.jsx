'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import {
  Eye, Search, ArrowUpDown, User, Phone, Calendar, MoreVertical, Filter, X
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
import Pagination from '@/components/ui/pagination';
import { usePagination } from '../../lib/hooks/usePagination';

export default function RidersPage() {
  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Table filtering states
  const [tableFilters, setTableFilters] = useState({
    phoneNumber: '',
    role: '',
    username: '',
    updatedAt: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination hook with same configuration as other pages
  const pagination = usePagination(filteredRiders, {
    initialItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 20, 50],
    resetPageOnDataChange: true
  });

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    applyTableFilters();
  }, [riders, tableFilters, sortConfig]);

  // Apply table-specific filters
  const applyTableFilters = () => {
    let filtered = [...riders];

    // Phone number filter
    if (tableFilters.phoneNumber) {
      filtered = filtered.filter(rider =>
        rider.phoneNumber?.toLowerCase().includes(tableFilters.phoneNumber.toLowerCase())
      );
    }

    // Role filter
    if (tableFilters.role) {
      filtered = filtered.filter(rider =>
        rider.role?.toLowerCase().includes(tableFilters.role.toLowerCase())
      );
    }

    // Username filter
    if (tableFilters.username) {
      filtered = filtered.filter(rider =>
        rider.username?.toLowerCase().includes(tableFilters.username.toLowerCase())
      );
    }

    // Date filter (simple text match against dd/mm/yy)
    if (tableFilters.updatedAt) {
      filtered = filtered.filter(rider => {
        if (rider.updatedAt) {
          const dateStr = formatDate(rider.updatedAt);
          return dateStr.toLowerCase().includes(tableFilters.updatedAt.toLowerCase());
        }
        return false;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'updatedAt') {
          aValue = a.updatedAt && a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(0);
          bValue = b.updatedAt && b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(0);
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

    setFilteredRiders(filtered);
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
      phoneNumber: '',
      role: '',
      username: '',
      updatedAt: ''
    });
  };

  // Fetch riders from 'users' collection
  const fetchRiders = async () => {
    setLoading(true);
    try {
      const ridersQuery = query(
        collection(db, 'users'), 
        where('role', '==', 'rider'),
        orderBy('updatedAt', 'desc')
      );
      const ridersSnapshot = await getDocs(ridersQuery);
      
      const ridersData = ridersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Fetched riders:', ridersData);
      setRiders(ridersData);
      setFilteredRiders(ridersData);
    } catch (error) {
      console.error('Error fetching riders:', error);
      // Fallback: try without orderBy if index doesn't exist
      try {
        const fallbackQuery = query(
          collection(db, 'users'), 
          where('role', '==', 'rider')
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        const fallbackData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRiders(fallbackData);
        setFilteredRiders(fallbackData);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    }
    setLoading(false);
  };

  // Show rider details modal
  const viewRiderDetails = (rider) => {
    setSelectedRider(rider);
    setShowDetails(true);
  };

  // Format phone number for display
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'N/A';
    return phoneNumber.replace(/(\+\d{2})(\d{10})/, '$1 $2');
  };

  // Format date for display (dd/mm/yy)
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const dateObj = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(dateObj.getTime())) return 'N/A';
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Actions Dropdown
  const ActionsDropdown = ({ rider }) => {
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
                    viewRiderDetails(rider);
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
          <p className="text-gray-600">Loading riders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Riders Management</h1>
          <p className="text-gray-600 mt-1">Manage all registered riders in the system</p>
        </div>
        <button
          onClick={fetchRiders}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Riders</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{riders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Phone Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {riders.filter(r => r.phoneNumber).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {riders.filter(r => {
                if (!r.updatedAt) return false;
                const updateDate = r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return updateDate > oneWeekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredRiders.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Riders ({filteredRiders.length})</span>
            {(tableFilters.phoneNumber || tableFilters.role || tableFilters.username || tableFilters.updatedAt) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </CardTitle>
          <CardDescription>
            Complete list of registered riders with filtering capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('username')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Username</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search username..."
                          value={tableFilters.username}
                          onChange={(e) => handleTableFilterChange('username', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('phoneNumber')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Phone Number</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search phone..."
                        value={tableFilters.phoneNumber}
                        onChange={(e) => handleTableFilterChange('phoneNumber', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Role</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search role..."
                        value={tableFilters.role}
                        onChange={(e) => handleTableFilterChange('role', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSort('updatedAt')}
                        className="flex items-center space-x-1 text-left hover:text-blue-600"
                      >
                        <span>Last Updated</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Search date..."
                        value={tableFilters.updatedAt}
                        onChange={(e) => handleTableFilterChange('updatedAt', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </TableHead>
                  
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedData.map((rider) => (
                  <TableRow key={rider.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {rider.username || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {rider.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatPhoneNumber(rider.phoneNumber)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {rider.role || 'N/A'}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatDate(rider.updatedAt)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <ActionsDropdown rider={rider} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Enhanced Pagination Controls - Matching Other Pages */}
          {filteredRiders.length > 0 && (
            <Pagination
              {...pagination.paginationProps}
              className="mt-4"
              showItemsPerPage={true}
              showPageInfo={true}
              showPageNumbers={true}
              maxPageNumbers={5}
            />
          )}
          
          {filteredRiders.length === 0 && !loading && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">
                {riders.length === 0 ? 'No riders found in the database' : 'No riders found matching your filters'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider Details Modal */}
      {showDetails && selectedRider && (
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
            margin: 0,
            padding: 0,
            zIndex: 9999
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Rider Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Username</label>
                  <p className="text-lg">{selectedRider.username || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="text-lg">{formatPhoneNumber(selectedRider.phoneNumber)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-lg">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                      {selectedRider.role}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-lg">{formatDate(selectedRider.updatedAt)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">{selectedRider.id}</p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
