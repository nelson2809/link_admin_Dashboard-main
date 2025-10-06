'use client';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
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
  Star,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  User,
  Car,
  MessageCircle,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  X
} from 'lucide-react';

// Custom Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel",
  isLoading = false,
  type = "danger" // "danger", "warning", "info"
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
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
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

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Modal Footer */}
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
                <span>Deleting...</span>
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

// Review Detail Modal Component
const ReviewDetailModal = ({ isOpen, onClose, feedback }) => {
  if (!isOpen || !feedback) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Feedback Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking ID</label>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
                {feedback.bookingId || 'N/A'}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <p className="text-sm text-gray-600 px-3 py-2">
                {feedback.createdAt ? new Date(
                  feedback.createdAt.toDate ? feedback.createdAt.toDate() : feedback.createdAt
                ).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm block break-all">
                {feedback.userId || 'N/A'}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
              <code className="bg-gray-100 px-3 py-2 rounded text-sm block break-all">
                {feedback.driverId || 'N/A'}
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRatingBadgeColor(feedback.rating || 0)} border`}>
                {feedback.rating || 0}/5
              </Badge>
              <div className="flex">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={`w-5 h-5 ${
                      index < (feedback.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review</label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800 leading-relaxed">
                {feedback.review || 'No review provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    feedbackId: null,
    feedbackDetails: null,
    isDeleting: false
  });
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    feedback: null
  });
  
  const [stats, setStats] = useState({
    totalFeedbacks: 0,
    averageRating: 0,
    ratingDistribution: {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    }
  });

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    filterAndSortFeedbacks();
  }, [feedbacks, searchTerm, ratingFilter, sortBy]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const feedbackQuery = query(
        collection(db, 'feedback'),
        orderBy('createdAt', 'desc')
      );
      
      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackData = feedbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setFeedbacks(feedbackData);
      calculateStats(feedbackData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (feedbackData) => {
    const totalFeedbacks = feedbackData.length;
    const ratings = feedbackData.map(f => f.rating || 0);
    const averageRating = totalFeedbacks > 0 ? 
      ratings.reduce((sum, rating) => sum + rating, 0) / totalFeedbacks : 0;

    const ratingDistribution = {
      5: feedbackData.filter(f => f.rating === 5).length,
      4: feedbackData.filter(f => f.rating === 4).length,
      3: feedbackData.filter(f => f.rating === 3).length,
      2: feedbackData.filter(f => f.rating === 2).length,
      1: feedbackData.filter(f => f.rating === 1).length,
    };

    setStats({
      totalFeedbacks,
      averageRating: averageRating.toFixed(1),
      ratingDistribution
    });
  };

  const filterAndSortFeedbacks = () => {
    let filtered = [...feedbacks];

    if (searchTerm) {
      filtered = filtered.filter(feedback =>
        feedback.review?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.driverId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.bookingId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (ratingFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.rating === parseInt(ratingFilter));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt) - 
                 new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt);
        case 'oldest':
          return new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt) - 
                 new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt);
        case 'rating_high':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating_low':
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });

    setFilteredFeedbacks(filtered);
  };

  // Handle delete confirmation modal
  const handleDeleteClick = (feedback) => {
    setConfirmModal({
      isOpen: true,
      feedbackId: feedback.id,
      feedbackDetails: feedback,
      isDeleting: false
    });
  };

  const handleDeleteConfirm = async () => {
    setConfirmModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await deleteDoc(doc(db, 'feedback', confirmModal.feedbackId));
      setFeedbacks(prev => prev.filter(f => f.id !== confirmModal.feedbackId));
      setConfirmModal({ isOpen: false, feedbackId: null, feedbackDetails: null, isDeleting: false });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Error deleting feedback. Please try again.');
      setConfirmModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    setConfirmModal({ isOpen: false, feedbackId: null, feedbackDetails: null, isDeleting: false });
  };

  // Handle review detail modal
  const handleViewReview = (feedback) => {
    setReviewModal({
      isOpen: true,
      feedback: feedback
    });
  };

  const handleReviewModalClose = () => {
    setReviewModal({ isOpen: false, feedback: null });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getRatingBadgeColor = (rating) => {
    if (rating >= 4) return 'bg-green-100 text-green-800 border-green-200';
    if (rating >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (rating >= 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
        <p className="text-gray-600">
          View and manage customer feedback and ratings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalFeedbacks}</div>
            <p className="text-xs text-muted-foreground">All feedback received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.averageRating}/5</div>
            <div className="flex items-center mt-1">
              {renderStars(Math.round(parseFloat(stats.averageRating)))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">5 Star Reviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ratingDistribution[5]}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalFeedbacks > 0 ? 
                `${((stats.ratingDistribution[5] / stats.totalFeedbacks) * 100).toFixed(1)}%` : 
                '0%'} of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.ratingDistribution).reverse().map(([rating, count]) => (
                <div key={rating} className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Star className="w-3 h-3 fill-current text-yellow-400 mr-1" />
                    {rating}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search feedback, users, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="rating_high">Highest Rating</SelectItem>
                <SelectItem value="rating_low">Lowest Rating</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setRatingFilter('all');
                setSortBy('newest');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback List ({filteredFeedbacks.length})</CardTitle>
          <CardDescription>
            All customer feedback and ratings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No feedback found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatDate(feedback.createdAt)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {feedback.bookingId?.substring(0, 8) || 'N/A'}...
                        </code>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate max-w-[100px] font-mono text-xs" title={feedback.userId}>
                            {feedback.userId?.substring(0, 8) || 'N/A'}...
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Car className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate max-w-[100px] font-mono text-xs" title={feedback.driverId}>
                            {feedback.driverId?.substring(0, 8) || 'N/A'}...
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getRatingBadgeColor(feedback.rating || 0)} border`}>
                            {feedback.rating || 0}/5
                          </Badge>
                          <div className="flex">
                            {renderStars(feedback.rating || 0)}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm truncate" title={feedback.review}>
                            {feedback.review || 'No review provided'}
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReview(feedback)}
                            title="View full review"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(feedback)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete feedback"
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
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={confirmModal.isDeleting}
        title="Delete Feedback"
        message={`Are you sure you want to delete this feedback? This action cannot be undone.
        
${confirmModal.feedbackDetails ? `
Rating: ${confirmModal.feedbackDetails.rating || 0}/5
Review: "${confirmModal.feedbackDetails.review || 'No review'}"` : ''}`}
        confirmText="Delete Feedback"
        cancelText="Cancel"
        type="danger"
      />

      {/* Review Detail Modal */}
      <ReviewDetailModal
        isOpen={reviewModal.isOpen}
        onClose={handleReviewModalClose}
        feedback={reviewModal.feedback}
      />
    </div>
  );
};

// Helper function moved outside component to fix reference error
const getRatingBadgeColor = (rating) => {
  if (rating >= 4) return 'bg-green-100 text-green-800 border-green-200';
  if (rating >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (rating >= 2) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
};

export default FeedbackPage;
