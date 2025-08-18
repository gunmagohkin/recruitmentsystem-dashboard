// Global state management
    const dashboardState = {
      rawData: [],
      filteredData: [],
      charts: {},
      filters: {
        timeRange: 'all',
        status: '',
        position: '',
        search: ''
      },
      currentPage: 1,
      pageSize: 10,
      trendView: 'weekly',
      lastUpdate: null
    };

    // Utility functions
    function formatDate(dateStr) {
      try {
        return new Date(dateStr).toLocaleDateString();
      } catch {
        return 'N/A';
      }
    }

    function showAlert(message, type = 'warning') {
      const banner = document.getElementById('alertBanner');
      const messageEl = document.getElementById('alertMessage');
      messageEl.textContent = message;
      
      let bgColor, borderColor, iconColor;
      if (type === 'error') {
        bgColor = 'bg-red-50';
        borderColor = 'border-red-400';
        iconColor = '❌';
      } else if (type === 'success') {
        bgColor = 'bg-green-50';
        borderColor = 'border-green-400';
        iconColor = '✅';
      } else {
        bgColor = 'bg-yellow-50';
        borderColor = 'border-yellow-400';
        iconColor = '⚠️';
      }
      
      banner.className = `${bgColor} border-l-4 ${borderColor} p-4`;
      banner.querySelector('.flex-shrink-0').textContent = iconColor;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 4000);
    }

    function updateLastUpdateTime() {
      const now = new Date();
      document.getElementById('lastUpdate').textContent = `Updated: ${now.toLocaleTimeString()}`;
      document.getElementById('dataStatus').textContent = `Last updated: ${now.toLocaleString()}`;
      dashboardState.lastUpdate = now;
    }

    // Enhanced data fetching
    async function fetchApplicants() {
      const refreshIcon = document.getElementById('refreshIcon');
      refreshIcon.classList.add('loading');
      
      try {
        const resp = await fetch("/.netlify/functions/fetchApplicants");
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        const data = await resp.json();
        updateLastUpdateTime();
        return data;
      } catch (error) {
        showAlert(`Failed to fetch data: ${error.message}`, 'error');
        throw error;
      } finally {
        refreshIcon.classList.remove('loading');
      }
    }

    // Filter data based on current filters
    function applyFilters(data) {
      return data.filter(record => {
        // Time filter
        if (dashboardState.filters.timeRange !== 'all') {
          const days = parseInt(dashboardState.filters.timeRange);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          if (new Date(record.createdAt) < cutoff) return false;
        }

        // Status filter
        if (dashboardState.filters.status && record.status !== dashboardState.filters.status) {
          return false;
        }

        // Position filter
        if (dashboardState.filters.position && record.position !== dashboardState.filters.position) {
          return false;
        }

        // Search filter
        if (dashboardState.filters.search) {
          const search = dashboardState.filters.search.toLowerCase();
          return (record.fullName?.toLowerCase().includes(search) ||
                  record.position?.toLowerCase().includes(search) ||
                  record.email?.toLowerCase().includes(search) ||
                  record.education?.toLowerCase().includes(search));
        }

        return true;
      });
    }

    // Chart creation
    function createChart(canvasId, type, data, options = {}) {
      const ctx = document.getElementById(canvasId);
      if (!ctx) return null;

      // Destroy existing chart
      if (dashboardState.charts[canvasId]) {
        dashboardState.charts[canvasId].destroy();
      }

      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: type === 'bar' ? 'top' : 'bottom',
            labels: { padding: 20, usePointStyle: true }
          }
        }
      };

      dashboardState.charts[canvasId] = new Chart(ctx, {
        type,
        data,
        options: { ...defaultOptions, ...options }
      });

      return dashboardState.charts[canvasId];
    }

    // Download chart as image
    function downloadChart(chartId) {
      const chart = dashboardState.charts[chartId];
      if (!chart) {
        showAlert('Chart not available for download', 'error');
        return;
      }

      const link = document.createElement('a');
      link.download = `${chartId}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = chart.toBase64Image();
      link.click();
      showAlert('Chart downloaded successfully!', 'success');
    }

    // Calculate analytics from current data
    function calculateAnalytics(data) {
      const analytics = {};
      
      // Basic counts
      analytics.totalApplicants = data.length;
      analytics.uniquePositions = [...new Set(data.map(r => r.position))].filter(Boolean).length;
      analytics.uniqueEducation = [...new Set(data.map(r => r.education))].filter(Boolean).length;
      
      // This month count
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      analytics.thisMonthCount = data.filter(r => new Date(r.createdAt) >= thisMonth).length;
      
      // Average per position
      analytics.avgPerPosition = analytics.uniquePositions > 0 ? 
        Math.round(analytics.totalApplicants / analytics.uniquePositions) : 0;
      
      // Trend calculation (last 30 vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const recent = data.filter(r => new Date(r.createdAt) >= thirtyDaysAgo).length;
      const previous = data.filter(r => {
        const date = new Date(r.createdAt);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length;

      analytics.trend = previous > 0 ? (((recent - previous) / previous) * 100).toFixed(1) : 0;
      
      return analytics;
    }

    // Update KPI cards
    function updateKPIs(analytics) {
      document.getElementById('totalApplicants').textContent = analytics.totalApplicants;
      document.getElementById('totalPositions').textContent = analytics.uniquePositions;
      document.getElementById('thisMonthCount').textContent = analytics.thisMonthCount;
      document.getElementById('educationCount').textContent = analytics.uniqueEducation;
      document.getElementById('avgPerPosition').textContent = `${analytics.avgPerPosition} Avg per Position`;
      
      const trendEl = document.getElementById('applicantsTrend');
      const trend = parseFloat(analytics.trend);
      trendEl.textContent = `${trend > 0 ? '+' : ''}${trend}% vs Last Month`;
      trendEl.className = `text-xs mt-1 ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'}`;
    }

    // Update all charts
    function updateCharts(data) {
      // Position chart
      const positionCounts = {};
      data.forEach(r => {
        if (r.position) positionCounts[r.position] = (positionCounts[r.position] || 0) + 1;
      });

      if (Object.keys(positionCounts).length > 0) {
        createChart('positionChart', 'bar', {
          labels: Object.keys(positionCounts),
          datasets: [{
            label: 'Applications',
            data: Object.values(positionCounts),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }]
        }, {
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        });
      }

      // Status chart
      const statusCounts = {};
      data.forEach(r => {
        if (r.status) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });

      if (Object.keys(statusCounts).length > 0) {
        createChart('statusChart', 'doughnut', {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']
          }]
        });
      }

      // Education chart
      const educationCounts = {};
      data.forEach(r => {
        if (r.education) educationCounts[r.education] = (educationCounts[r.education] || 0) + 1;
      });

      if (Object.keys(educationCounts).length > 0) {
        createChart('educationChart', 'pie', {
          labels: Object.keys(educationCounts),
          datasets: [{
            data: Object.values(educationCounts),
            backgroundColor: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#F97316']
          }]
        });
      }

      // Day of week chart
      const dayCounts = {'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0};
      data.forEach(r => {
        if (r.createdAt) {
          try {
            const day = new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
            if (dayCounts[day] !== undefined) dayCounts[day]++;
          } catch (e) {
            console.warn('Invalid date:', r.createdAt);
          }
        }
      });

      createChart('dayChart', 'bar', {
        labels: Object.keys(dayCounts),
        datasets: [{
          label: 'Applications',
          data: Object.values(dayCounts),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }]
      }, {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      });

      // Trend chart
      updateTrendChart(data);
    }

    // Update trend chart based on current view
    function updateTrendChart(data) {
      const counts = {};
      
      data.forEach(r => {
        if (r.createdAt) {
          try {
            const date = new Date(r.createdAt);
            let key;
            
            if (dashboardState.trendView === 'weekly') {
              // Get start of week (Sunday)
              const startOfWeek = new Date(date);
              startOfWeek.setDate(date.getDate() - date.getDay());
              key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
              key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
            
            counts[key] = (counts[key] || 0) + 1;
          } catch (e) {
            console.warn('Invalid date in trend:', r.createdAt);
          }
        }
      });

      const sortedKeys = Object.keys(counts).sort((a, b) => {
        try {
          return new Date(a + ', 2025') - new Date(b + ', 2025');
        } catch {
          return 0;
        }
      });
      const last12 = sortedKeys.slice(-12);

      createChart('trendChart', 'line', {
        labels: last12,
        datasets: [{
          label: 'Applications',
          data: last12.map(k => counts[k] || 0),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      }, {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: {
          legend: { display: false }
        }
      });
    }

    // Change trend view
    function changeTrendView(view) {
      dashboardState.trendView = view;
      
      // Update button styles
      document.getElementById('weeklyView').className = view === 'weekly' ? 
        'px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded' : 
        'px-3 py-1 text-sm text-gray-600 rounded hover:bg-gray-100';
      document.getElementById('monthlyView').className = view === 'monthly' ? 
        'px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded' : 
        'px-3 py-1 text-sm text-gray-600 rounded hover:bg-gray-100';
      
      // Update chart
      updateTrendChart(dashboardState.filteredData);
    }

    // Update table with pagination
    function updateTable(data) {
      const start = (dashboardState.currentPage - 1) * dashboardState.pageSize;
      const end = start + dashboardState.pageSize;
      const paginatedData = data.slice(start, end);
      
      const tbody = document.getElementById('applicantsTable');
      tbody.innerHTML = paginatedData.map(record => `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="font-medium text-gray-900">${record.fullName || 'N/A'}</div>
            ${record.email ? `<div class="text-sm text-gray-500">${record.email}</div>` : ''}
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${record.position || 'N/A'}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}">
              ${record.status || 'N/A'}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${record.education || 'N/A'}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(record.createdAt)}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
            ${record.phone ? `<div>📞 ${record.phone}</div>` : ''}
            ${record.email ? `<div>✉️ ${record.email.length > 25 ? record.email.substring(0, 25) + '...' : record.email}</div>` : ''}
          </td>
        </tr>
      `).join('');
      
      // Update pagination info
      const totalPages = Math.ceil(data.length / dashboardState.pageSize);
      document.getElementById('tableInfo').textContent = 
        `Showing ${data.length > 0 ? start + 1 : 0} to ${Math.min(end, data.length)} of ${data.length} applicants`;
      document.getElementById('pageInfo').textContent = `Page ${dashboardState.currentPage} of ${Math.max(totalPages, 1)}`;
      
      // Update pagination buttons
      document.getElementById('prevPage').disabled = dashboardState.currentPage <= 1;
      document.getElementById('nextPage').disabled = dashboardState.currentPage >= totalPages;
    }

    // Get status color classes
    function getStatusColor(status) {
      const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'reviewing': 'bg-blue-100 text-blue-800',
        'interviewed': 'bg-purple-100 text-purple-800',
        'hired': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'application received': 'bg-blue-100 text-blue-800',
        'screening': 'bg-indigo-100 text-indigo-800',
        'interview scheduled': 'bg-purple-100 text-purple-800',
        'offer extended': 'bg-green-100 text-green-800'
      };
      const key = status?.toLowerCase() || '';
      return colors[key] || 'bg-gray-100 text-gray-800';
    }

    // Populate filter dropdowns
    function populateFilterOptions(data) {
      // Status filter
      const statuses = [...new Set(data.map(r => r.status))].filter(Boolean).sort();
      const statusFilter = document.getElementById('statusFilter');
      statusFilter.innerHTML = '<option value="">All Status</option>' + 
        statuses.map(s => `<option value="${s}">${s}</option>`).join('');

      // Position filter
      const positions = [...new Set(data.map(r => r.position))].filter(Boolean).sort();
      const positionFilter = document.getElementById('positionFilter');
      positionFilter.innerHTML = '<option value="">All Positions</option>' + 
        positions.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // Main dashboard build function
    async function buildDashboard() {
      try {
        const rawData = await fetchApplicants();
        console.log('Raw data:', rawData);
        
        if (!Array.isArray(rawData)) {
          throw new Error('Invalid data format received');
        }
        
        dashboardState.rawData = rawData;
        dashboardState.filteredData = applyFilters(rawData);
        dashboardState.currentPage = 1;

        const analytics = calculateAnalytics(dashboardState.filteredData);
        updateKPIs(analytics);
        updateCharts(dashboardState.filteredData);
        updateTable(dashboardState.filteredData);
        populateFilterOptions(rawData);

        showAlert(`Dashboard updated with ${rawData.length} records`, 'success');

      } catch (error) {
        console.error('Dashboard build error:', error);
        showAlert('Failed to load dashboard data', 'error');
      }
    }

    // Event listeners
    document.addEventListener('DOMContentLoaded', buildDashboard);

    // Filter event listeners
    document.getElementById('timeFilter').addEventListener('change', (e) => {
      dashboardState.filters.timeRange = e.target.value;
      dashboardState.currentPage = 1;
      dashboardState.filteredData = applyFilters(dashboardState.rawData);
      const analytics = calculateAnalytics(dashboardState.filteredData);
      updateKPIs(analytics);
      updateCharts(dashboardState.filteredData);
      updateTable(dashboardState.filteredData);
    });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
      dashboardState.filters.status = e.target.value;
      dashboardState.currentPage = 1;
      dashboardState.filteredData = applyFilters(dashboardState.rawData);
      updateTable(dashboardState.filteredData);
    });

    document.getElementById('positionFilter').addEventListener('change', (e) => {
      dashboardState.filters.position = e.target.value;
      dashboardState.currentPage = 1;
      dashboardState.filteredData = applyFilters(dashboardState.rawData);
      updateTable(dashboardState.filteredData);
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      dashboardState.filters.search = e.target.value;
      dashboardState.currentPage = 1;
      dashboardState.filteredData = applyFilters(dashboardState.rawData);
      updateTable(dashboardState.filteredData);
    });

    // Pagination event listeners
    document.getElementById('prevPage').addEventListener('click', () => {
      if (dashboardState.currentPage > 1) {
        dashboardState.currentPage--;
        updateTable(dashboardState.filteredData);
      }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
      const totalPages = Math.ceil(dashboardState.filteredData.length / dashboardState.pageSize);
      if (dashboardState.currentPage < totalPages) {
        dashboardState.currentPage++;
        updateTable(dashboardState.filteredData);
      }
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      console.log('Manual refresh triggered');
      buildDashboard();
    });

    // Export functionality
    document.getElementById('exportBtn').addEventListener('click', () => {
      try {
        const data = dashboardState.filteredData;
        if (data.length === 0) {
          showAlert('No data to export', 'warning');
          return;
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + 
          'Full Name,Position,Status,Education,Email,Phone,Applied Date\n' +
          data.map(r => 
            `"${(r.fullName || '').replace(/"/g, '""')}","${(r.position || '').replace(/"/g, '""')}","${(r.status || '').replace(/"/g, '""')}","${(r.education || '').replace(/"/g, '""')}","${(r.email || '').replace(/"/g, '""')}","${(r.phone || '').replace(/"/g, '""')}","${formatDate(r.createdAt)}"`
          ).join('\n');
        
        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.download = `recruitment-report-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showAlert(`Exported ${data.length} records to CSV`, 'success');
      } catch (error) {
        console.error('Export error:', error);
        showAlert('Failed to export data', 'error');
      }
    });

    // Auto-refresh every 5 minutes
    setInterval(() => {
      console.log('Auto-refreshing dashboard...');
      buildDashboard();
    }, 5 * 60 * 1000);

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + R for refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        buildDashboard();
      }
      
      // Ctrl/Cmd + E for export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        document.getElementById('exportBtn').click();
      }
    });

    // Add error boundary
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      showAlert('An unexpected error occurred', 'error');
    });

    // Handle visibility change (refresh when tab becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && dashboardState.lastUpdate) {
        const timeSinceUpdate = Date.now() - dashboardState.lastUpdate.getTime();
        // Refresh if it's been more than 10 minutes since last update
        if (timeSinceUpdate > 10 * 60 * 1000) {
          console.log('Tab became visible, refreshing stale data');
          buildDashboard();
        }
      }
    });