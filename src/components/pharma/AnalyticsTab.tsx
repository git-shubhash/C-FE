import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  BarChart, 
  BarChart3, 
  Calendar, 
  Download, 
  DollarSign, 
  FileSpreadsheet, 
  LineChart, 
  Package, 
  PieChart, 
  PieChartIcon, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  AreaChart, 
  BarChart as RechartsBarChart, 
  PieChart as RechartsPieChart, 
  ComposedChart,
  Line, 
  Area, 
  Bar, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { analyticsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading';

export const AnalyticsTab: React.FC = () => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<any>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState('daily');
  const [revenueInterval, setRevenueInterval] = useState('daily');
  const [monthlyInterval, setMonthlyInterval] = useState('monthly');
  const [chartType, setChartType] = useState('line');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [summaryData, salesTrendData, topMedicinesData, monthlyData, inventoryData] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getSalesTrend(),
        analyticsApi.getTopMedicines(),
        analyticsApi.getMonthlyTrends(),
        analyticsApi.getInventoryAnalytics()
      ]);
      
      setAnalyticsData({
        summary: summaryData,
        salesTrends: salesTrendData,
        topMedicines: topMedicinesData,
        paymentBreakdown: summaryData.paymentBreakdown
      });
      setMonthlyTrends(monthlyData);
      setInventoryAnalytics(inventoryData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async (type: string) => {
    try {
      let data;
      let filename = 'analytics-data.xlsx';
      
      if (type === 'complete') {
        data = await analyticsApi.exportComplete();
        filename = 'complete-analytics-report.xlsx';
      } else if (type === 'revenue') {
        data = await analyticsApi.exportRevenue();
        filename = 'revenue-data.xlsx';
      } else if (type === 'medicines') {
        // Create detailed medicines export with all required fields
        const medicinesData = analyticsData?.topMedicines?.map((medicine: any, index: number) => {
          // Calculate unit price from revenue and quantity if not available
          const revenue = typeof medicine.total_revenue === 'string' ? parseFloat(medicine.total_revenue) : (medicine.total_revenue || 0);
          const quantity = medicine.total_quantity || medicine.quantity || 0;
          const unitPrice = quantity > 0 ? (revenue / quantity) : 0;
          
          return {
            'Rank': index + 1,
            'Medicine Name': medicine.medication_name || medicine.name,
            'Unit Price': unitPrice.toFixed(2),
            'Units Sold': quantity,
            'Revenue': revenue.toFixed(2),
            'Stock Status': medicine.stock_status || 'Available'
          };
        }) || [];
        
        data = medicinesData;
        filename = 'all-medicines-report.xlsx';
      } else {
        data = await analyticsApi.exportSalesSummary();
        filename = 'analytics-summary.xlsx';
      }

      console.log('Export data:', data);
      console.log('Export type:', type);

      // Import XLSX dynamically
      const XLSX = await import('xlsx');
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Handle different data structures
      let worksheet;
      if (Array.isArray(data)) {
        worksheet = XLSX.utils.json_to_sheet(data);
      } else if (typeof data === 'object' && data !== null) {
        // If data is an object with multiple sheets
        Object.entries(data).forEach(([sheetName, sheetData]) => {
          const ws = XLSX.utils.json_to_sheet(Array.isArray(sheetData) ? sheetData : [sheetData]);
          XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        });
      } else {
        // Fallback for single data object
        worksheet = XLSX.utils.json_to_sheet([data]);
      }
      
      // Add worksheet to workbook if it's a single sheet
      if (worksheet) {
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data');
      }
      
      // Generate blob and download
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const prepareSalesData = () => {
    if (!analyticsData?.salesTrends) return [];
    return analyticsData.salesTrends.map((item: any) => {
      // Format date properly
      let formattedDate = item.date;
      if (item.date) {
        try {
          const date = new Date(item.date);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
          }
        } catch (error) {
          formattedDate = item.date;
        }
      } else {
        formattedDate = new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      }
      
      return {
        date: formattedDate,
        sales: typeof item.sales_count === 'string' ? parseInt(item.sales_count) : (item.sales_count || 0),
        revenue: typeof item.revenue === 'string' ? parseFloat(item.revenue) : (item.revenue || 0)
      };
    });
  };

  const prepareTopMedicinesData = () => {
    if (!analyticsData?.topMedicines) return [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#FF9F43', '#00B894', '#6C5CE7', '#FD79A8', '#FDCB6E', '#E17055', '#74B9FF'];
    return analyticsData.topMedicines.map((item: any, index: number) => ({
      name: item.medication_name || item.name,
      value: typeof item.total_revenue === 'string' ? parseFloat(item.total_revenue) : (item.total_revenue || 0),
      fill: colors[index % colors.length]
    }));
  };

  const preparePaymentBreakdownData = () => {
    if (!analyticsData?.paymentBreakdown) return [];
    return analyticsData.paymentBreakdown.map((item: any) => ({
      name: item.payment_mode === 'cash' ? 'Cash' : 'Online',
      value: typeof item.revenue === 'string' ? parseFloat(item.revenue) : (item.revenue || 0),
      fill: item.payment_mode === 'cash' ? '#10b981' : '#3b82f6'
    }));
  };

  const prepareMonthlyData = () => {
    if (!monthlyTrends) return [];
    return monthlyTrends.map((item: any) => ({
      month: item.month,
      sales: parseInt(item.sales_count),
      revenue: parseFloat(item.revenue),
      items: parseInt(item.total_items)
    }));
  };

  const prepareFilteredMonthlyData = () => {
    const data = prepareMonthlyData();
    
    if (monthlyInterval === 'daily') {
      // Use daily sales data for daily view
      const dailyData = prepareSalesData();
      return dailyData.slice(-30).map((item: any) => ({
        month: item.date,
        sales: item.sales,
        revenue: item.revenue,
        items: item.sales // Using sales count as items for daily view
      }));
    } else if (monthlyInterval === 'weekly') {
      // Group daily data by week
      const dailyData = prepareSalesData();
      const weeklyData = dailyData.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const existingWeek = acc.find(w => w.month === weekKey);
        if (existingWeek) {
          existingWeek.sales += item.sales;
          existingWeek.revenue += item.revenue;
          existingWeek.items += item.sales;
        } else {
          acc.push({
            month: weekKey,
            sales: item.sales,
            revenue: item.revenue,
            items: item.sales
          });
        }
        return acc;
      }, []);
      
      return weeklyData.slice(-12).map(item => ({
        ...item,
        month: new Date(item.month).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      }));
    } else if (monthlyInterval === 'monthly') {
      // Use original monthly data with proper formatting
      return data.map(item => ({
        ...item,
        month: new Date(item.month).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        })
      }));
    } else if (monthlyInterval === 'yearly') {
      // Group monthly data by year
      const yearlyData = data.reduce((acc: any[], item: any) => {
        const year = new Date(item.month).getFullYear().toString();
        
        const existingYear = acc.find(y => y.month === year);
        if (existingYear) {
          existingYear.sales += item.sales;
          existingYear.revenue += item.revenue;
          existingYear.items += item.items;
        } else {
          acc.push({
            month: year,
            sales: item.sales,
            revenue: item.revenue,
            items: item.items
          });
        }
        return acc;
      }, []);
      
      return yearlyData;
    } else {
      return data;
    }
  };

  const prepareFilteredSalesData = () => {
    const data = prepareSalesData();
    
    if (selectedInterval === 'daily') {
      return data.slice(-30); // Last 30 days
    } else if (selectedInterval === 'weekly') {
      // Group data by week
      const weeklyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const existingWeek = acc.find(w => w.date === weekKey);
        if (existingWeek) {
          existingWeek.sales += item.sales;
          existingWeek.revenue += item.revenue;
        } else {
          acc.push({
            date: weekKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format weekly dates
      return weeklyData.slice(-12).map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      }));
    } else if (selectedInterval === 'monthly') {
      // Group data by month
      const monthlyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existingMonth = acc.find(m => m.date === monthKey);
        if (existingMonth) {
          existingMonth.sales += item.sales;
          existingMonth.revenue += item.revenue;
        } else {
          acc.push({
            date: monthKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format monthly dates
      return monthlyData.slice(-12).map(item => ({
        ...item,
        date: new Date(item.date + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        })
      }));
    } else if (selectedInterval === 'yearly') {
      // Group data by year
      const yearlyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const yearKey = date.getFullYear().toString();
        
        const existingYear = acc.find(y => y.date === yearKey);
        if (existingYear) {
          existingYear.sales += item.sales;
          existingYear.revenue += item.revenue;
        } else {
          acc.push({
            date: yearKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format yearly dates
      return yearlyData.slice(-5).map(item => ({
        ...item,
        date: item.date
      }));
    } else {
      return data.slice(-12); // Default to last 12 days
    }
  };

  const prepareRevenueData = () => {
    const data = prepareSalesData();
    
    if (revenueInterval === 'daily') {
      return data.slice(-30); // Last 30 days
    } else if (revenueInterval === 'weekly') {
      // Group data by week
      const weeklyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const existingWeek = acc.find(w => w.date === weekKey);
        if (existingWeek) {
          existingWeek.sales += item.sales;
          existingWeek.revenue += item.revenue;
        } else {
          acc.push({
            date: weekKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format weekly dates
      return weeklyData.slice(-12).map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      }));
    } else if (revenueInterval === 'monthly') {
      // Group data by month
      const monthlyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existingMonth = acc.find(m => m.date === monthKey);
        if (existingMonth) {
          existingMonth.sales += item.sales;
          existingMonth.revenue += item.revenue;
        } else {
          acc.push({
            date: monthKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format monthly dates
      return monthlyData.slice(-12).map(item => ({
        ...item,
        date: new Date(item.date + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric'
        })
      }));
    } else if (revenueInterval === 'yearly') {
      // Group data by year
      const yearlyData = data.reduce((acc: any[], item: any) => {
        const date = new Date(item.date);
        const yearKey = date.getFullYear().toString();
        
        const existingYear = acc.find(y => y.date === yearKey);
        if (existingYear) {
          existingYear.sales += item.sales;
          existingYear.revenue += item.revenue;
        } else {
          acc.push({
            date: yearKey,
            sales: item.sales,
            revenue: item.revenue
          });
        }
        return acc;
      }, []);
      
      // Format yearly dates
      return yearlyData.slice(-5).map(item => ({
        ...item,
        date: item.date
      }));
    } else {
      return data; // All data
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const statsData = [
    {
      title: "Total Revenue",
      value: analyticsData?.summary?.totalRevenue ? `₹${parseFloat(analyticsData.summary.totalRevenue).toLocaleString()}` : "₹0",
      icon: <DollarSign className="h-5 w-5" />,
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: "Total Bills",
      value: analyticsData?.summary?.totalBills ? analyticsData.summary.totalBills.toLocaleString() : "0",
      icon: <Activity className="h-5 w-5" />,
      change: '+8.2%',
      changeType: 'positive'
    },
    {
      title: "Medicines in Stock",
      value: analyticsData?.summary?.totalMedicines ? analyticsData.summary.totalMedicines.toLocaleString() : "0",
      icon: <BarChart className="h-5 w-5" />,
      change: '+3.1%',
      changeType: 'positive'
    },
    {
      title: "Low Stock Items",
      value: analyticsData?.summary?.lowStockCount ? analyticsData.summary.lowStockCount.toLocaleString() : "0",
      icon: <Users className="h-5 w-5" />,
      change: '-5.2%',
      changeType: 'negative'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your pharmacy performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportExcel('complete')}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs flex items-center gap-1 mt-1 ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
              <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Sales Trend
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="medicines" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Top Medicines
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={monthlyInterval} onValueChange={setMonthlyInterval}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {prepareFilteredMonthlyData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={prepareFilteredMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? `₹${value}` : `${value}`,
                          name === 'revenue' ? 'Revenue' : name === 'sales' ? 'Sales Count' : 'Items Sold'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="sales" fill="#8884d8" opacity={0.8} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={3} />
                      <Line yAxisId="left" type="monotone" dataKey="items" stroke="#ffc658" strokeWidth={2} strokeDasharray="5 5" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading monthly data..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Sales Trend Analysis
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedInterval} onValueChange={setSelectedInterval}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {prepareFilteredSalesData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <RechartsLineChart data={prepareFilteredSalesData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'sales' ? `${value} sales` : `₹${value}`,
                            name === 'sales' ? 'Sales Count' : 'Revenue'
                          ]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                        />
                      </RechartsLineChart>
                    ) : chartType === 'area' ? (
                      <AreaChart data={prepareFilteredSalesData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'sales' ? `${value} sales` : `₹${value}`,
                            name === 'sales' ? 'Sales Count' : 'Revenue'
                          ]}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stackId="1" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stackId="2" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    ) : (
                      <RechartsBarChart data={prepareFilteredSalesData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'sales' ? `${value} sales` : `₹${value}`,
                            name === 'sales' ? 'Sales Count' : 'Revenue'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="sales" fill="#8884d8" />
                        <Bar dataKey="revenue" fill="#82ca9d" />
                      </RechartsBarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading chart data..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Analysis
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={revenueInterval} onValueChange={setRevenueInterval}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {prepareRevenueData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={prepareRevenueData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? `₹${value}` : `${value}`,
                          name === 'revenue' ? 'Revenue' : 'Sales Count'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="sales" fill="#8884d8" opacity={0.8} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading chart data..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medicines" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Top Performing Medicines
                  </CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportExcel('medicines')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-1">
                  <div className="h-80 bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 shadow-lg">
                    {prepareTopMedicinesData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={prepareTopMedicinesData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={60}
                            innerRadius={20}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            {prepareTopMedicinesData().map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.fill}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner text="Loading medicine data..." />
                      </div>
                    )}
                  </div>
                </div>
                                <div className="lg:col-span-1">
                  <div className="h-80 bg-white rounded-lg p-4 border border-gray-200 overflow-y-auto">
                    <div className="space-y-3">
                     {analyticsData?.topMedicines?.slice(0, 5).map((medicine: any, index: number) => (
                       <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center">
                             {index + 1}
                           </div>
                           <div>
                             <div className="font-medium text-gray-900">
                               {medicine.medication_name || medicine.name}
                             </div>
                             <div className="text-xs text-gray-500">
                               {medicine.total_quantity || medicine.quantity} units sold
                             </div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-semibold text-blue-600">
                             ₹{typeof medicine.total_revenue === 'string' ? parseFloat(medicine.total_revenue).toFixed(2) : (medicine.total_revenue || 0).toFixed(2)}
                           </div>
                           <div className="text-xs text-gray-400">
                             Revenue
                           </div>
                         </div>
                       </div>
                     ))}
                                          {analyticsData?.topMedicines?.length > 5 && (
                       <div className="text-center py-2">
                         <p className="text-sm text-muted-foreground">
                           Showing top 5 of {analyticsData.topMedicines.length} medicines
                         </p>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Payment Method Breakdown
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-1">
                  <div className="h-80 bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 shadow-lg">
                    {preparePaymentBreakdownData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={preparePaymentBreakdownData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            innerRadius={30}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            {preparePaymentBreakdownData().map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.fill}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner text="Loading payment data..." />
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="h-80 bg-white rounded-lg p-4 border border-gray-200 overflow-y-auto">
                    <div className="space-y-3">
                      {analyticsData?.paymentBreakdown?.map((payment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {payment.payment_mode === 'cash' ? 'Cash' : 'Online'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payment.count} transactions
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">
                              ₹{(typeof payment.revenue === 'string' ? parseFloat(payment.revenue) : (payment.revenue || 0)).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Revenue
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};