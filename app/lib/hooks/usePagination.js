import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for managing pagination state and logic
 * @param {Array} data - The array of data to paginate
 * @param {Object} options - Configuration options
 * @param {number} options.initialPage - Initial page number (default: 1)
 * @param {number} options.initialItemsPerPage - Initial items per page (default: 10)
 * @param {Array} options.itemsPerPageOptions - Available items per page options
 * @param {boolean} options.resetPageOnDataChange - Whether to reset to page 1 when data changes
 * @returns {Object} Pagination state and methods
 */
export const usePagination = (data = [], options = {}) => {
  const {
    initialPage = 1,
    initialItemsPerPage = 10,
    itemsPerPageOptions = [5, 10, 20, 50, 100],
    resetPageOnDataChange = true
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calculate pagination values
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset page when data changes (if enabled)
  useEffect(() => {
    if (resetPageOnDataChange) {
      setCurrentPage(1);
    }
  }, [data.length, resetPageOnDataChange]);

  // Ensure current page is within valid range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Pagination methods
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const changeItemsPerPage = (newItemsPerPage) => {
    const validItemsPerPage = Math.max(1, newItemsPerPage);
    setItemsPerPage(validItemsPerPage);
    
    // Calculate what the current page should be to maintain roughly the same position
    const currentFirstItem = (currentPage - 1) * itemsPerPage + 1;
    const newPage = Math.max(1, Math.ceil(currentFirstItem / validItemsPerPage));
    setCurrentPage(newPage);
  };

  // Reset pagination to initial state
  const reset = () => {
    setCurrentPage(initialPage);
    setItemsPerPage(initialItemsPerPage);
  };

  // Get pagination info
  const getPaginationInfo = () => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return {
      startItem,
      endItem,
      totalItems,
      currentPage,
      totalPages,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    };
  };

  return {
    // Data
    paginatedData,
    
    // State
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    
    // Methods
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changeItemsPerPage,
    reset,
    
    // Setters (for direct control if needed)
    setCurrentPage,
    setItemsPerPage,
    
    // Info
    getPaginationInfo,
    
    // Computed properties
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    
    // For the Pagination component
    paginationProps: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      onPageChange: goToPage,
      onItemsPerPageChange: changeItemsPerPage,
      itemsPerPageOptions
    }
  };
};

/**
 * Hook for managing pagination with search/filter functionality
 * @param {Array} originalData - The original unfiltered data
 * @param {Function} filterFunction - Function to filter the data
 * @param {Object} paginationOptions - Options for pagination
 * @returns {Object} Pagination state with filtered data
 */
export const usePaginationWithFilter = (originalData = [], filterFunction = null, paginationOptions = {}) => {
  // Apply filter if provided
  const filteredData = useMemo(() => {
    if (!filterFunction) return originalData;
    return originalData.filter(filterFunction);
  }, [originalData, filterFunction]);

  // Use pagination with filtered data
  const pagination = usePagination(filteredData, paginationOptions);

  return {
    ...pagination,
    filteredData,
    originalData,
    isFiltered: filteredData.length !== originalData.length
  };
};

export default usePagination;