'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Search,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Edit,
  X,
  AlertTriangle
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { usePagination } from '../../lib/hooks/usePagination';

// Helper functions - moved to top
const isSubscriptionActive = (subscription) => {
  if (!subscription.endDate) return false;
  const endDate = subscription.endDate.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
  return endDate > new Date();
};

const getSubscriptionStatus = (subscription) => {
  if (subscription.isDummy) return 'Test';
  return isSubscriptionActive(subscription) ? 'Active' : 'Expired';
};

const getSubscriptionStatusColor = (subscription) => {
  if (subscription.isDummy) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return isSubscriptionActive(subscription) 
    ? 'bg-green-100 text-green-800 border-green-200' 
    : 'bg-red-100 text-red-800 border-red-200';
};

// Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isLoading = false,
  type = "danger"
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          iconBg: "bg-red-100"
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          iconBg: "bg-yellow-100"
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          iconBg: "bg-blue-100"
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div 
      className="fixed bg-black bg-opacity-50 flex items-center justify-center overflow-auto"
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full ${typeStyles.iconBg} flex items-center justify-center`}>
              {typeStyles.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="min-w-[80px]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-w-[80px] ${typeStyles.confirmButton} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Subscription Detail Modal Component
const SubscriptionDetailModal = ({ isOpen, onClose, subscription }) => {
  if (!isOpen || !subscription) return null;

  return (
    <div 
      className="fixed bg-black bg-opacity-50 flex items-center justify-center overflow-auto"
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {subscription.plan || 'N/A'}
                </Badge>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {subscription.planCode || 'N/A'}
                </code>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <p className="text-lg font-semibold text-green-600">
                ₹{subscription.price || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm capitalize">{subscription.method || 'N/A'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment ID</label>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block break-all">
                {subscription.payment_id || 'N/A'}
              </code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <p className="text-sm text-gray-600">
                {subscription.startDate ? new Date(
                  subscription.startDate.toDate ? subscription.startDate.toDate() : subscription.startDate
                ).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <p className="text-sm text-gray-600">
                {subscription.endDate ? new Date(
                  subscription.endDate.toDate ? subscription.endDate.toDate() : subscription.endDate
                ).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saved Card</label>
              <span className="text-sm text-gray-600">{subscription.saved_card || 'None'}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Badge className={subscription.isDummy ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                {subscription.isDummy ? 'Dummy/Test' : 'Live'}
              </Badge>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex items-center space-x-2">
              <Badge className={getSubscriptionStatusColor(subscription)}>
                {getSubscriptionStatus(subscription)}
              </Badge>
              {isSubscriptionActive(subscription) && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const SubscriptionPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    subscriptionId: null,
    subscriptionDetails: null,
    isDeleting: false
  });
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    subscription: null
  });
  
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    dummySubscriptions: 0,
    planDistribution: {}
  });

  // Pagination hook with same configuration as other pages
  const pagination = usePagination(filteredSubscriptions, {
    initialItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 20, 50],
    resetPageOnDataChange: true
  });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    filterAndSortSubscriptions();
  }, [subscriptions, searchTerm, planFilter, statusFilter, sortBy]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      // Fetch from both users collection and subscription subcollection
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const allSubscriptions = [];
      
      // Fetch subscriptions from each user's subcollection
      for (const userDoc of usersSnapshot.docs) {
        const subscriptionQuery = query(
          collection(db, 'users', userDoc.id, 'subscription'),
          orderBy('startDate', 'desc')
        );
        const subscriptionSnapshot = await getDocs(subscriptionQuery);
        
        subscriptionSnapshot.forEach(subDoc => {
          allSubscriptions.push({
            id: subDoc.id,
            userId: userDoc.id,
            userEmail: userDoc.data().email || 'N/A',
            ...subDoc.data()
          });
        });
      }

      setSubscriptions(allSubscriptions);
      calculateStats(allSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (subscriptionData) => {
    const totalSubscriptions = subscriptionData.length;
    const activeSubscriptions = subscriptionData.filter(sub => isSubscriptionActive(sub)).length;
    const totalRevenue = subscriptionData.reduce((sum, sub) => sum + (sub.price || 0), 0);
    const dummySubscriptions = subscriptionData.filter(sub => sub.isDummy).length;
    
    const planDistribution = {};
    subscriptionData.forEach(sub => {
      const plan = sub.plan || 'Unknown';
      planDistribution[plan] = (planDistribution[plan] || 0) + 1;
    });

    setStats({
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      dummySubscriptions,
      planDistribution
    });
  };

  const filterAndSortSubscriptions = () => {
    let filtered = [...subscriptions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(subscription =>
        subscription.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscription.method?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(subscription => subscription.plan === planFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(subscription => isSubscriptionActive(subscription));
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(subscription => !isSubscriptionActive(subscription));
      } else if (statusFilter === 'dummy') {
        filtered = filtered.filter(subscription => subscription.isDummy);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.startDate?.toDate ? b.startDate.toDate() : b.startDate) - 
                 new Date(a.startDate?.toDate ? a.startDate.toDate() : a.startDate);
        case 'oldest':
          return new Date(a.startDate?.toDate ? a.startDate.toDate() : a.startDate) - 
                 new Date(b.startDate?.toDate ? b.startDate.toDate() : b.startDate);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        default:
          return 0;
      }
    });

    setFilteredSubscriptions(filtered);
  };

  // Handle delete confirmation modal
  const handleDeleteClick = (subscription) => {
    setConfirmModal({
      isOpen: true,
      subscriptionId: subscription.id,
      subscriptionDetails: subscription,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    setConfirmModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await deleteDoc(doc(db, 'users', confirmModal.subscriptionDetails.userId, 'subscription', confirmModal.subscriptionId));
      setSubscriptions(prev => prev.filter(s => s.id !== confirmModal.subscriptionId));
      setConfirmModal({ isOpen: false, subscriptionId: null, subscriptionDetails: null, isDeleting: false });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Error deleting subscription. Please try again.');
      setConfirmModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    setConfirmModal({ isOpen: false, subscriptionId: null, subscriptionDetails: null, isDeleting: false });
  };

  // Handle detail modal
  const handleViewDetails = (subscription) => {
    setDetailModal({
      isOpen: true,
      subscription: subscription
    });
  };

  const handleDetailModalClose = () => {
    setDetailModal({ isOpen: false, subscription: null });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600">
          View and manage all user subscriptions and payments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">All subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSubscriptions > 0 ? 
                `${((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(1)}%` : 
                '0%'} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.dummySubscriptions}</div>
            <p className="text-xs text-muted-foreground">Dummy/Test subscriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {Object.keys(stats.planDistribution)
                  .sort((a, b) => {
                    // Custom sorting function for plans
                    const getPlanOrder = (plan) => {
                      if (plan.includes('1 Ride')) return 1;
                      if (plan.includes('6 Rides')) return 2;
                      if (plan.includes('12 Rides')) return 3;
                      if (plan.toLowerCase().includes('yearly')) return 4;
                      return 5; // Any other plans go last
                    };
                    return getPlanOrder(a) - getPlanOrder(b);
                  })
                  .map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="dummy">Test/Dummy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_high">Price High to Low</SelectItem>
                <SelectItem value="price_low">Price Low to High</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setPlanFilter('all');
                setStatusFilter('all');
                setSortBy('newest');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription List ({filteredSubscriptions.length})</CardTitle>
          <CardDescription>
            All user subscriptions and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No subscriptions found matching your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedData.map((subscription) => (
                      <TableRow key={`${subscription.userId}-${subscription.id}`}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium truncate max-w-[150px]" title={subscription.userEmail}>
                              {subscription.userEmail}
                            </p>
                            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                              {subscription.userId?.substring(0, 8)}...
                            </code>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {subscription.plan || 'N/A'}
                            </Badge>
                            <code className="block text-xs text-gray-500">
                              {subscription.planCode || 'N/A'}
                            </code>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            ₹{subscription.price || 0}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm capitalize">
                              {subscription.method || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(subscription.startDate)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(subscription.endDate)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={getSubscriptionStatusColor(subscription)}>
                              {getSubscriptionStatus(subscription)}
                            </Badge>
                            {subscription.isDummy && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                Test
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(subscription)}
                              title="View full details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(subscription)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              title="Delete subscription"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination Controls - Matching Previous Pages */}
              <Pagination
                {...pagination.paginationProps}
                className="mt-4"
                showItemsPerPage={true}
                showPageInfo={true}
                showPageNumbers={true}
                maxPageNumbers={5}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={confirmModal.isDeleting}
        title="Delete Subscription"
        message={`Are you sure you want to delete this subscription? This action cannot be undone.
        
${confirmModal.subscriptionDetails ? `
User: ${confirmModal.subscriptionDetails.userEmail}
Plan: ${confirmModal.subscriptionDetails.plan || 'N/A'}
Price: ₹${confirmModal.subscriptionDetails.price || 0}` : ''}`}
        confirmText="Delete Subscription"
        cancelText="Cancel"
        type="danger"
      />

      {/* Subscription Detail Modal */}
      <SubscriptionDetailModal
        isOpen={detailModal.isOpen}
        onClose={handleDetailModalClose}
        subscription={detailModal.subscription}
      />
    </div>
  );
};

export default SubscriptionPage;
