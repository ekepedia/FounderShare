/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents all application constants.
 *
 * @author TCSASSEMBLER
 * @version 1.5
 *
 * Changes in 1.1:
 * 1. add GiftCardGiftStatus, GiftCardGiftType, PendingGiftMessageType
 * 2. add to actionType: GIFT_CARD_GIFT_ACCEPTED, GIFT_CARD_GIFTED
 * Changes in 1.2:
 * 1. add BITLY_BASE_URL
 *
 * Changes in version 1.3
 * - Add DELETE_PLATFORM_ADMIN and ADD_PLATFORM_ADMIN
 *
 * Changes in version 1.4 (Project Mom and Pop - MiscUpdate5):
 * - Remove prefix GIFT_CARD_ from ActionTypes
 * 
 * Changes in version 1.5
 * - Add DEFAULT_QUERY_LIMIT
 * - Add DEFAULT_QUERY_OFFSET
 */
'use strict';

module.exports = {
    GiftCardOfferStatus: {
        ACTIVE: 'ACTIVE',
        ENDED: 'ENDED',
        CANCELLED: 'CANCELLED',
        DRAFT: 'DRAFT'
    },
    GiftCardStatus: {
        ACTIVE: 'ACTIVE',
        INACTIVE: 'INACTIVE'
    },
    GiftCardGiftStatus: {
        PENDING: 'PENDING',
        ACCEPTED: 'ACCEPTED',
        EXPIRED: 'EXPIRED',
        NOT_DELIVERED: 'NOT_DELIVERED'
    },
    GiftCardGiftType: {
        EMAIL: 'EMAIL',
        PHONE_NUMBER: 'PHONE_NUMBER',
        TWITTER: 'TWITTER'
    },
    PendingGiftMessageType: {
        EMAIL: 'EMAIL',
        PHONE_NUMBER: 'PHONE_NUMBER'
    },
    ActionType: {
        GIFT_CARD_PURCHASE: "PURCHASE",
        GIFT_CARD_REDEMPTION: "REDEMPTION",
        GIFT_CARD_GIFTED: "GIFTED",
        GIFT_CARD_GIFT_ACCEPTED: "GIFT_ACCEPTED",
        ADD_PLATFORM_ADMIN: "ADD_PLATFORM_ADMIN",
        DELETE_PLATFORM_ADMIN: "DELETE_PLATFORM_ADMIN"
    },
    UserRole: {
        INDIVIDUAL_USER: 'INDIVIDUAL_USER',
        BUSINESS_EMPLOYEE: 'BUSINESS_EMPLOYEE',
        BUSINESS_ADMIN: 'BUSINESS_ADMIN',
        CLIENT: 'CLIENT',
        PLATFORM_EMPLOYEE: 'PLATFORM_EMPLOYEE'
    },
    AccountType: {
        FOUNDER: 'FOUNDER',
        CHAMPION: 'CHAMPION'
    },
    SocialNetwork: {
        FACEBOOK: 'FACEBOOK',
        TWITTER: 'TWITTER',
        LINKEDIN: 'LINKEDIN'
    },
    AuthenticationType: {
        PASSWORD: 'PASSWORD',
        FACEBOOK: 'FACEBOOK',
        TWITTER: 'TWITTER',
        LINKEDIN: 'LINKEDIN'
    },
    SortOrder: {
        ASCENDING: "Ascending",
        DESCENDING: "Descending"
    },
    DEFAULT_SORT_BY: "id",
    DEFAULT_SORT_ORDER: "Ascending",
    DEFAULT_PAGE_SIZE: 5,
    DEFAULT_QUERY_LIMIT: 30,
    DEFAULT_QUERY_OFFSET: 0,
    SAFE_RANDOM_LENGTH: 20,//safe length when generating random token (collisions are almost impossible);
    FACEBOOK_PROFILE_URL: "https://graph.facebook.com/me",
    TWITTER_PROFILE_URL: 'https://api.twitter.com/1.1/account/verify_credentials.json',
    LINKEDIN_PROFILE_URL: 'https://api.linkedin.com/v1/people/~:(id,first-name,last-name,email-address,picture-url)?format=json',
    BITLY_BASE_URL: "https://api-ssl.bitly.com"
};
