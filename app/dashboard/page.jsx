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
      };
    }
  };


  // Generate weekly revenue data from bookings
  const generateWeeklyRevenueData = (bookings) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyStats = days.map((day) => ({ day, revenue: 0, bookings: 0 }));


    // Get current week's bookings
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));


    bookings.forEach((booking) => {
      if (booking.createdAt && booking.status === "completed") {
        const bookingDate = booking.createdAt.toDate
          ? booking.createdAt.toDate()
          : new Date(booking.createdAt);
        const daysDiff = Math.floor(
          (bookingDate - weekStart) / (1000 * 60 * 60 * 24)
        );


        if (daysDiff >= 0 && daysDiff < 7) {
          weeklyStats[daysDiff].revenue += booking.fare || booking.amount || 0;
          weeklyStats[daysDiff].bookings += 1;
        }
      }
    });


    return weeklyStats;
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


      // Generate monthly registration data
      const monthlyData = generateMonthlyRegistrationData(
        driversWithDetails,
        clientsData
      );
      setChartData(monthlyData);


      // Updated pie chart data for KYC status distribution
      setPieData([
        { name: "Verified", value: kycVerified, color: "#10b981" },
        { name: "Pending", value: kycPending, color: "#f59e0b" },
        { name: "Rejected", value: kycRejected, color: "#ef4444" },
        { name: "Submitted", value: kycSubmitted, color: "#3b82f6" },
        { name: "Not Submitted", value: kycNotSubmitted, color: "#6b7280" },
      ]);


      // Generate dynamic revenue data based on actual bookings
      const weeklyRevenueData = generateWeeklyRevenueData(
        bookingsStats.recentBookings
      );
      setRevenueData(weeklyRevenueData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };


  // Generate monthly registration data based on creation dates
  const generateMonthlyRegistrationData = (drivers, clients) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentYear = new Date().getFullYear();


    const monthlyStats = months.map((month) => ({
      month,
      drivers: 0,
      clients: 0,
    }));


    // Count drivers by month
    drivers.forEach((driver) => {
      if (driver.createdAt) {
        const date = driver.createdAt.toDate
          ? driver.createdAt.toDate()
          : new Date(driver.createdAt);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyStats[monthIndex].drivers++;
        }
      }
    });


    // Count clients by month
    clients.forEach((client) => {
      if (client.createdAt) {
        const date = client.createdAt.toDate
          ? client.createdAt.toDate()
          : new Date(client.createdAt);
        if (date.getFullYear() === currentYear) {
          const monthIndex = date.getMonth();
          monthlyStats[monthIndex].clients++;
        }
      }
    });


    return monthlyStats.slice(0, 6); // Show last 6 months
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
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalClients}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Registered users
            </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Trends</CardTitle>
            <CardDescription>
              Driver and client registrations over time
            </CardDescription>
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
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="drivers" fill="#3b82f6" radius={4} />
                  <Bar dataKey="clients" fill="#10b981" radius={4} />
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
          <CardTitle>Weekly Revenue & Bookings</CardTitle>
          <CardDescription>
            Revenue and booking trends for the past week
          </CardDescription>
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
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
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
