/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This file contains only jsdoc definitions.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

/**
 * Represents information about a paginated search result.
 * @typedef {Object} PaginationResult
 * @property {Number} totalPages the number of total pages
 * @property {Number} pageNumber the number of current page
 * @property {Number} totalRecords the number of total records
 * @property {Array} items the array of found objects
 */

/**
 * Represents the base search criteria. All base properties are optional.
 * @typedef {Object} BaseSearchCriteria
 * @property {Integer} pageNumber the page number. Starts from 1. Use 0 for no pagination.
 * @property {Integer} pageSize the page size.
 * @property {String} sortBy the name of the property that will be used to sort the results, default to "id".
 * @property {String} sortOrder the sorting order. Must be one of "Ascending", "Descending", default to "Ascending".
 */