"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import AuthGuard from '../components/AuthGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Users,
  Car,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  LogOut,
  Search,
  Filter,
  User,
  CalendarDays,
} from "lucide-react";


function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalRevenue: 0,
    activeBookings: 0,
    kycPending: 0,
    kycVerified: 0,
    kycRejected: 0,
    kycSubmitted: 0,
    kycNotSubmitted: 0,
    vehicleActive: 0,
    vehicleInactive: 0,
    vehiclesWithoutInfo: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New state for user table and filtering
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // New state for dynamic chart
  const [chartTimePeriod, setChartTimePeriod] = useState('6months');
  const [chartGrowthData, setChartGrowthData] = useState({
    driversGrowth: 0,
    clientsGrowth: 0,
    totalGrowth: 0
  });

  // New state for dynamic revenue chart
  const [revenueTimePeriod, setRevenueTimePeriod] = useState('week');
  const [revenueGrowthData, setRevenueGrowthData] = useState({
    revenueGrowth: 0,
    bookingsGrowth: 0
  });
  const [allBookings, setAllBookings] = useState([]);

  // New state for bookings table and filtering
  const [allBookingsTable, setAllBookingsTable] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');


  // Get user from localStorage once component mounts
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const userData = JSON.parse(token);
        setUser(userData);
        // Start fetching dashboard data
        fetchDashboardData();
      } catch (error) {
        console.error('Invalid token:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);


  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };


  // Helper function to determine KYC display status
  const getKYCDisplayStatus = (kycApproved, kycStatus, documentCount) => {
    if (typeof kycApproved === "boolean") {
      if (kycApproved) return "verified";
      // If explicitly rejected (false) and has kycStatus as rejected, show rejected
      if (kycStatus === "rejected") return "rejected";
      return "pending";
    }
    if (documentCount > 0 && (!kycStatus || kycStatus === "not-submitted")) {
      return "submitted";
    }
    return kycStatus || "not-submitted";
  };


  // Filter users based on search term and role
  const filterUsers = (searchTerm, role) => {
    let filtered = allUsers;

    // Filter by search term (ID, email, name)
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by role
    if (role !== 'all') {
      filtered = filtered.filter(user => {
        if (role === 'rider') {
          return user.role === 'client' || user.role === 'customer' || user.role === 'rider' || !user.role;
        }
        return user.role === role;
      });
    }

    setFilteredUsers(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setUserFilter(searchTerm);
    filterUsers(searchTerm, roleFilter);
  };

  // Handle role filter change
  const handleRoleFilterChange = (role) => {
    setRoleFilter(role);
    filterUsers(userFilter, role);
  };


  // Fetch bookings data from Firestore
  const fetchBookingsData = async () => {
    try {
      // Fetch all bookings from the 'bookings' collection
      const bookingsQuery = query(
        collection(db, "bookings"),
        orderBy("createdAt", "desc")
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Store all bookings for revenue chart
      setAllBookings(bookingsData);

      // Calculate booking statistics
      const activeBookings = bookingsData.filter(
        (booking) =>
          booking.status === "active" ||
          booking.status === "in-progress" ||
          booking.status === "ongoing" ||
          booking.status === "accepted"
      ).length;


      const completedBookings = bookingsData.filter(
        (booking) => booking.status === "completed"
      ).length;


      const cancelledBookings = bookingsData.filter(
        (booking) => booking.status === "cancelled"
      ).length;


      const pendingBookings = bookingsData.filter(
        (booking) =>
          booking.status === "pending" || booking.status === "requested"
      ).length;


      // Calculate total revenue from completed bookings
      const totalRevenue = bookingsData
        .filter((booking) => booking.status === "completed")
        .reduce(
          (sum, booking) => sum + (booking.fare || booking.amount || 0),
          0
        );


      // Get recent bookings for activity feed
      const recentBookings = bookingsData.slice(0, 5);


      return {
        activeBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        totalRevenue,
        recentBookings,
        totalBookings: bookingsData.length,
        allBookings: bookingsData,
      };
    } catch (error) {
      console.error("Error fetching bookings data:", error);
      return {
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        recentBookings: [],
        totalBookings: 0,
        allBookings: [],
      };
    }
  };

  // Enhanced Generate dynamic revenue data with multiple time periods
  const generateDynamicRevenueData = (bookings, timePeriod) => {
    const now = new Date();
    let startDate, endDate, dataPoints = [];
    
    switch (timePeriod) {
      case 'week':
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        startDate = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        dataPoints = days.map((day, index) => ({
          period: day,
          revenue: 0,
          bookings: 0,
          date: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000)
        }));
        break;
        
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysInMonth = endDate.getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
          dataPoints.push({
            period: i.toString(),
            revenue: 0,
            bookings: 0,
            date: new Date(now.getFullYear(), now.getMonth(), i)
          });
        }
        break;
        
      case '3months':
        for (let i = 2; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dataPoints.push({
            period: monthDate.toLocaleDateString('en-US', { month: 'short' }),
            revenue: 0,
            bookings: 0,
            date: monthDate
          });
        }
        break;
        
      case '6months':
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dataPoints.push({
            period: monthDate.toLocaleDateString('en-US', { month: 'short' }),
            revenue: 0,
            bookings: 0,
            date: monthDate
          });
        }
        break;
        
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          dataPoints.push({
            period: monthDate.toLocaleDateString('en-US', { month: 'short' }),
            revenue: 0,
            bookings: 0,
            date: monthDate
          });
        }
        break;
    }

    // Count bookings and revenue for each period
    bookings.forEach((booking) => {
      if (booking.createdAt && booking.status === "completed") {
        const bookingDate = booking.createdAt.toDate
          ? booking.createdAt.toDate()
          : new Date(booking.createdAt);

        dataPoints.forEach((point) => {
          let isInPeriod = false;
          
          if (timePeriod === 'week') {
            const daysDiff = Math.floor((bookingDate - point.date) / (1000 * 60 * 60 * 24));
            isInPeriod = daysDiff >= 0 && daysDiff < 1;
          } else if (timePeriod === 'month') {
            isInPeriod = bookingDate.getDate() === point.date.getDate() &&
                        bookingDate.getMonth() === point.date.getMonth() &&
                        bookingDate.getFullYear() === point.date.getFullYear();
          } else {
            isInPeriod = bookingDate.getMonth() === point.date.getMonth() &&
                        bookingDate.getFullYear() === point.date.getFullYear();
          }

          if (isInPeriod) {
            point.revenue += booking.fare || booking.amount || 0;
            point.bookings += 1;
          }
        });
      }
    });

    // Calculate growth rates
    if (dataPoints.length >= 2) {
      const recent = dataPoints.slice(-2);
      const currentRevenue = recent[1].revenue || 0;
      const previousRevenue = recent[0].revenue || 0;
      const currentBookings = recent[1].bookings || 0;
      const previousBookings = recent[0].bookings || 0;

      const revenueGrowth = previousRevenue === 0 
        ? (currentRevenue > 0 ? 100 : 0)
        : ((currentRevenue - previousRevenue) / previousRevenue * 100);
        
      const bookingsGrowth = previousBookings === 0 
        ? (currentBookings > 0 ? 100 : 0)
        : ((currentBookings - previousBookings) / previousBookings * 100);

      setRevenueGrowthData({
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        bookingsGrowth: Math.round(bookingsGrowth * 10) / 10
      });
    }

    return dataPoints;
  };

  // Filter bookings based on search term and status
  const filterBookings = (searchTerm, status) => {
    let filtered = allBookingsTable;

    // Filter by search term (ID, pickup, dropoff, driver, client)
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.pickupLocation && booking.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.dropoffLocation && booking.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.driverId && booking.driverId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.clientId && booking.clientId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(booking => booking.status === status);
    }

    setFilteredBookings(filtered);
  };

  // Handle booking search input change
  const handleBookingSearchChange = (e) => {
    const searchTerm = e.target.value;
    setBookingFilter(searchTerm);
    filterBookings(searchTerm, statusFilter);
  };

  // Handle booking status filter change
  const handleBookingStatusFilterChange = (status) => {
    setStatusFilter(status);
    filterBookings(bookingFilter, status);
  };

  // Main function to fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users from the 'users' collection
      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Store all users for the table
      setAllUsers(usersData);
      setFilteredUsers(usersData);

      // Separate drivers and clients based on role
      const driversData = usersData.filter((user) => user.role === "driver");
      const clientsData = usersData.filter(
        (user) =>
          user.role === "client" || user.role === "customer" || user.role === "rider" || !user.role
      );


      // Fetch bookings data
      const bookingsStats = await fetchBookingsData();

      // Store all bookings for revenue chart
      setAllBookings(bookingsStats.allBookings);

      // Fetch KYC documents and vehicles for each driver
      const driversWithDetails = await Promise.all(
        driversData.map(async (driver) => {
          try {
            // 1. Fetch KYC documents from 'kyc' subcollection
            const kycQuery = collection(db, "users", driver.id, "kyc");
            const kycSnapshot = await getDocs(kycQuery);
            let kycDocuments = {};
            kycSnapshot.forEach((doc) => {
              const docData = doc.data();
              kycDocuments[doc.id] = {
                url:
                  docData.url ||
                  docData.photoUrl ||
                  docData.fileUrl ||
                  docData.documentUrl,
                uploadedAt: docData.uploadedAt || docData.createdAt,
                type: docData.type || doc.id,
                ...docData,
              };
            });


            // 2. Fetch vehicle from 'vehicles' subcollection
            const vehiclesQuery = collection(
              db,
              "users",
              driver.id,
              "vehicles"
            );
            const vehiclesSnapshot = await getDocs(vehiclesQuery);
            let vehicle = null;
            if (!vehiclesSnapshot.empty) {
              const vehicleDoc = vehiclesSnapshot.docs[0];
              vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
            }


            return {
              ...driver,
              kycDocuments,
              vehicle,
              kycDocumentCount: Object.keys(kycDocuments).length,
            };
          } catch (error) {
            console.error(
              `Error fetching details for driver ${driver.id}:`,
              error
            );
            return {
              ...driver,
              kycDocuments: {},
              vehicle: null,
              kycDocumentCount: 0,
            };
          }
        })
      );


      // Calculate statistics based on your actual data structure
      const totalDrivers = driversWithDetails.length;
      const activeDrivers = driversWithDetails.filter(
        (d) => d.is_active !== false
      ).length;

      // KYC Statistics using the same logic as your drivers table
      let kycVerified = 0;
      let kycPending = 0;
      let kycRejected = 0;
      let kycSubmitted = 0;
      let kycNotSubmitted = 0;


      driversWithDetails.forEach((driver) => {
        const kycStatus = getKYCDisplayStatus(
          driver.kyc_approved,
          driver.kycStatus,
          driver.kycDocumentCount
        );


        switch (kycStatus) {
          case "verified":
            kycVerified++;
            break;
          case "pending":
            kycPending++;
            break;
          case "rejected":
            kycRejected++;
            break;
          case "submitted":
            kycSubmitted++;
            break;
          default:
            kycNotSubmitted++;
        }
      });


      // Vehicle Statistics
      const vehicleActive = driversWithDetails.filter(
        (d) => d.vehicleActive !== false && d.vehicle
      ).length;
      const vehicleInactive = driversWithDetails.filter(
        (d) => d.vehicleActive === false && d.vehicle
      ).length;
      const vehiclesWithoutInfo = driversWithDetails.filter(
        (d) => !d.vehicle
      ).length;


      // Update stats with real bookings data
      setStats({
        totalClients: clientsData.length,
        totalDrivers,
        activeDrivers,
        totalRevenue: bookingsStats.totalRevenue,
        activeBookings: bookingsStats.activeBookings,
        kycPending,
        kycVerified,
        kycRejected,
        kycSubmitted,
        kycNotSubmitted,
        vehicleActive,
        vehicleInactive,
        vehiclesWithoutInfo,
      });


      // Set recent bookings for activity feed
      setRecentBookings(bookingsStats.recentBookings);


      // Generate dynamic registration data
      const dynamicChartData = generateDynamicRegistrationData(
        driversData,
        clientsData,
        chartTimePeriod
      );
      setChartData(dynamicChartData);


      // Updated pie chart data for KYC status distribution
      setPieData([
        { name: "Verified", value: kycVerified, color: "#10b981" },
        { name: "Pending", value: kycPending, color: "#f59e0b" },
        { name: "Rejected", value: kycRejected, color: "#ef4444" },
        { name: "Submitted", value: kycSubmitted, color: "#3b82f6" },
        { name: "Not Submitted", value: kycNotSubmitted, color: "#6b7280" },
      ]);


      // Generate dynamic revenue data based on actual bookings
      const dynamicRevenueData = generateDynamicRevenueData(
        bookingsStats.allBookings,
        revenueTimePeriod
      );
      setRevenueData(dynamicRevenueData);

      // Set all bookings for the bookings table
      setAllBookingsTable(bookingsStats.allBookings);
      setFilteredBookings(bookingsStats.allBookings);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };


  // Enhanced Generate registration data with dynamic time periods
  const generateDynamicRegistrationData = (drivers, clients, timePeriod) => {
    const now = new Date();
    let startDate, endDate, dateFormat, groupBy;
    
    switch (timePeriod) {
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFormat = 'month';
        groupBy = 'month';
        break;
      case '12months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFormat = 'month';
        groupBy = 'month';
        break;
      case 'currentYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        dateFormat = 'month';
        groupBy = 'month';
        break;
      case 'allTime':
        // Find the earliest registration date
        const allDates = [...drivers, ...clients]
          .map(user => {
            if (user.createdAt) {
              return user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            }
            return null;
          })
          .filter(date => date !== null);
        
        if (allDates.length > 0) {
          const earliestDate = new Date(Math.min(...allDates));
          startDate = new Date(earliestDate.getFullYear(), 0, 1);
        } else {
          startDate = new Date(now.getFullYear() - 2, 0, 1);
        }
        endDate = new Date(now.getFullYear(), 11, 31);
        dateFormat = 'year';
        groupBy = 'year';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFormat = 'month';
        groupBy = 'month';
    }

    const dataPoints = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      let label, key;
      
      if (groupBy === 'month') {
        label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        key = `${current.getFullYear()}-${current.getMonth()}`;
      } else {
        label = current.getFullYear().toString();
        key = current.getFullYear().toString();
      }

      dataPoints.push({
        period: label,
        key: key,
        drivers: 0,
        clients: 0,
        total: 0
      });

      if (groupBy === 'month') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setFullYear(current.getFullYear() + 1);
      }
    }

    // Count registrations for each period
    const countRegistrations = (users, userType) => {
      users.forEach(user => {
        if (user.createdAt) {
          const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          
          if (date >= startDate && date <= endDate) {
            let periodKey;
            
            if (groupBy === 'month') {
              periodKey = `${date.getFullYear()}-${date.getMonth()}`;
            } else {
              periodKey = date.getFullYear().toString();
            }

            const dataPoint = dataPoints.find(dp => dp.key === periodKey);
            if (dataPoint) {
              dataPoint[userType]++;
              dataPoint.total++;
            }
          }
        }
      });
    };

    countRegistrations(drivers, 'drivers');
    countRegistrations(clients, 'clients');

    // Calculate growth rates
    const calculateGrowth = (data, field) => {
      if (data.length < 2) return 0;
      
      const recent = data.slice(-2);
      const current = recent[1][field] || 0;
      const previous = recent[0][field] || 0;
      
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100);
    };

    const driversGrowth = calculateGrowth(dataPoints, 'drivers');
    const clientsGrowth = calculateGrowth(dataPoints, 'clients');
    const totalGrowth = calculateGrowth(dataPoints, 'total');

    setChartGrowthData({
      driversGrowth: Math.round(driversGrowth * 10) / 10,
      clientsGrowth: Math.round(clientsGrowth * 10) / 10,
      totalGrowth: Math.round(totalGrowth * 10) / 10
    });

    return dataPoints;
  };

  // Handle time period change
  const handleTimePeriodChange = (period) => {
    setChartTimePeriod(period);
    // Regenerate chart data with new time period
    if (allUsers.length > 0) {
      const driversData = allUsers.filter((user) => user.role === "driver");
      const clientsData = allUsers.filter(
        (user) =>
          user.role === "client" || user.role === "customer" || user.role === "rider" || !user.role
      );
      
      const dynamicChartData = generateDynamicRegistrationData(
        driversData,
        clientsData,
        period
      );
      setChartData(dynamicChartData);
    }
  };

  // Handle revenue time period change
  const handleRevenueTimePeriodChange = (period) => {
    setRevenueTimePeriod(period);
    if (allBookings.length > 0) {
      const dynamicRevenueData = generateDynamicRevenueData(allBookings, period);
      setRevenueData(dynamicRevenueData);
    }
  };

  // Navigate to drivers page
  const navigateToDrivers = () => {
    router.push('/drivers');
  };

  // Navigate to users page
  const navigateToUsers = () => {
    router.push('/users');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 p-6">
      {/* Header with Logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your car booking platform today.
          </p>
        </div>
      </div>


      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.kycVerified}
            </div>
            <p className="text-xs text-muted-foreground">Approved drivers</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalDrivers}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <span className="text-green-600">
                {stats.activeDrivers} active
              </span>
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              From completed bookings
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.activeBookings}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              Current active trips
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Driver Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.kycPending}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.kycRejected}
            </div>
            <p className="text-xs text-muted-foreground">Need resubmission</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Vehicles
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.vehicleActive}
            </div>
            <p className="text-xs text-muted-foreground">Vehicles in service</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Vehicles
            </CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.vehicleInactive}
            </div>
            <p className="text-xs text-muted-foreground">Vehicles offline</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Changed to Single Column */}
      <div className="grid grid-cols-1 gap-6">
        {/* Enhanced Registration Trends */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Registration Trends
                </CardTitle>
                <CardDescription>
                  Driver and client registrations over time
                </CardDescription>
              </div>
              
              {/* Time Period Selector */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: '6months', label: '6M' },
                  { key: '12months', label: '12M' },
                  { key: 'currentYear', label: 'Year' },
                  { key: 'allTime', label: 'All' }
                ].map((period) => (
                  <Button
                    key={period.key}
                    variant={chartTimePeriod === period.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTimePeriodChange(period.key)}
                    className="text-xs px-2 py-1"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Growth Indicators */}
            <div className="grid grid-cols-3 gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-500">Drivers Growth</div>
                <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                  chartGrowthData.driversGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {chartGrowthData.driversGrowth >= 0 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  {Math.abs(chartGrowthData.driversGrowth)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Clients Growth</div>
                <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                  chartGrowthData.clientsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {chartGrowthData.clientsGrowth >= 0 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  {Math.abs(chartGrowthData.clientsGrowth)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Growth</div>
                <div className={`text-sm font-semibold flex items-center justify-center gap-1 ${
                  chartGrowthData.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {chartGrowthData.totalGrowth >= 0 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  {Math.abs(chartGrowthData.totalGrowth)}%
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                drivers: {
                  label: "Drivers",
                  color: "#3b82f6",
                },
                clients: {
                  label: "Clients",
                  color: "#10b981",
                },
                total: {
                  label: "Total",
                  color: "#8b5cf6",
                },
              }}
              className="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="period" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-gray-900">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} style={{ color: entry.color }} className="text-sm">
                                {entry.name}: {entry.value}
                              </p>
                            ))}
                            <p className="text-sm text-gray-600 border-t pt-1 mt-1">
                              Total: {payload.reduce((sum, entry) => 
                                entry.dataKey !== 'total' ? sum + entry.value : sum, 0
                              )}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="drivers" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="clients" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>


        {/* KYC Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Status Distribution</CardTitle>
            <CardDescription>
              Current driver verification status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                verified: { label: "Verified", color: "#10b981" },
                pending: { label: "Pending", color: "#f59e0b" },
                rejected: { label: "Rejected", color: "#ef4444" },
                submitted: { label: "Submitted", color: "#3b82f6" },
                notSubmitted: { label: "Not Submitted", color: "#6b7280" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Revenue & Bookings Trends</CardTitle>
              <CardDescription>
                Revenue and booking trends for the selected period
              </CardDescription>
            </div>
            
            {/* Time Period Selection */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
                { key: '3months', label: '3 Months' },
                { key: '6months', label: '6 Months' },
                { key: 'year', label: 'This Year' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => handleRevenueTimePeriodChange(period.key)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    revenueTimePeriod === period.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Growth Indicators */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Revenue Growth:</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                revenueGrowthData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {revenueGrowthData.revenueGrowth >= 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                {Math.abs(revenueGrowthData.revenueGrowth)}%
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Bookings Growth:</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                revenueGrowthData.bookingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {revenueGrowthData.bookingsGrowth >= 0 ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                {Math.abs(revenueGrowthData.bookingsGrowth)}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Revenue",
                color: "#8b5cf6",
              },
              bookings: {
                label: "Bookings",
                color: "#06b6d4",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <XAxis 
                  dataKey="period" 
                  fontSize={12}
                  angle={revenueTimePeriod === 'month' ? -45 : 0}
                  textAnchor={revenueTimePeriod === 'month' ? 'end' : 'middle'}
                  height={revenueTimePeriod === 'month' ? 60 : 30}
                />
                <YAxis fontSize={12} />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium text-gray-900 mb-2">{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              ></div>
                              <span className="text-gray-600">{entry.dataKey}:</span>
                              <span className="font-medium">
                                {entry.dataKey === 'revenue' 
                                  ? `$${entry.value.toLocaleString()}` 
                                  : entry.value
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#06b6d4"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Complete list of all registered users with filtering options
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilterChange('all')}
              >
                All ({allUsers.length})
              </Button>
              <Button
                variant={roleFilter === 'driver' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilterChange('driver')}
              >
                Drivers Details ({allUsers.filter(u => u.role === 'driver').length})
              </Button>
              <Button
                variant={roleFilter === 'rider' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilterChange('rider')}
                className="flex items-center space-x-1"
              >
                <User className="h-3 w-3" />
                <span>Rider Details ({allUsers.filter(u => u.role === 'client' || u.role === 'customer' || u.role === 'rider' || !u.role).length})</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by User ID, email, or name..."
                value={userFilter}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {allUsers.length} users
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">
                        {user.id}
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        {user.name || user.displayName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'driver' 
                            ? 'bg-blue-100 text-blue-800' 
                            : user.role === 'client' || user.role === 'customer' || user.role === 'rider' || !user.role
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'client' || user.role === 'customer' || !user.role ? 'rider' : user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {user.createdAt 
                          ? new Date(
                              user.createdAt.toDate 
                                ? user.createdAt.toDate() 
                                : user.createdAt
                            ).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Booking Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div key={booking.id} className="flex items-center space-x-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      booking.status === "completed"
                        ? "bg-green-500"
                        : booking.status === "active" ||
                          booking.status === "in-progress"
                        ? "bg-blue-500"
                        : booking.status === "cancelled"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Booking{" "}
                      {booking.status === "completed"
                        ? "completed"
                        : booking.status === "active"
                        ? "in progress"
                        : booking.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {booking.pickupLocation || "Pickup location"} →{" "}
                      {booking.dropoffLocation || "Destination"}
                      {booking.fare && ` • $${booking.fare}`}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {booking.createdAt &&
                      new Date(
                        booking.createdAt.toDate
                          ? booking.createdAt.toDate()
                          : booking.createdAt
                      ).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">System Status</p>
                    <p className="text-xs text-gray-500">
                      Platform is running smoothly
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      KYC verification completed
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.kycVerified} drivers currently verified
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Vehicle status updated
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.vehicleActive} vehicles are currently active
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Platform status</p>
                    <p className="text-xs text-gray-500">
                      {stats.activeDrivers} active drivers ready for bookings
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent />
    </AuthGuard>
  );
}
