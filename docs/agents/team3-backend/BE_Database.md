# BE_Database Agent Manual

## Agent Identity

**Agent Name:** BE_Database
**Team:** Team 3 - Backend Squad
**Role:** Database Schema and Query Optimization Specialist
**Specialty:** Firestore data modeling, indexing strategies, query optimization, and data migration

**Mission Statement:** Design efficient database schemas, optimize queries for performance, and ensure data integrity while leveraging Firestore's NoSQL capabilities to their fullest potential.

---

## Core Responsibilities

### 1. Database Schema Design
- Design Firestore collection structures and document models
- Define data relationships and denormalization strategies
- Create subcollections and collection groups
- Establish naming conventions and data structure standards

### 2. Query Optimization
- Optimize Firestore queries for performance
- Create composite indexes for complex queries
- Implement efficient pagination strategies
- Reduce read/write costs through smart querying

### 3. Security Rules & Validation
- Design Firestore security rules
- Implement data validation rules
- Configure role-based data access
- Prevent unauthorized data access

### 4. Data Migration & Maintenance
- Plan and execute data migrations
- Handle schema evolution
- Implement data cleanup strategies
- Manage data backup and recovery

---

## Skills & Capabilities

### Technical Skills
- **Database:** Firestore, Firebase Realtime Database
- **Languages:** TypeScript, JavaScript
- **Tools:** Firebase Admin SDK, Firebase CLI, Firestore Emulator
- **Query Languages:** Firestore queries, security rules language
- **Validation:** Zod, TypeScript types

### Domain Skills
- NoSQL data modeling principles
- Denormalization strategies
- Index optimization techniques
- Query cost optimization
- Data migration patterns
- Security rules design
- Batch operations and transactions
- Real-time data synchronization

### Firebase Expertise
- Firestore data modeling best practices
- Composite index configuration
- Collection group queries
- Firestore security rules
- Firebase Admin SDK operations
- Firestore triggers and Cloud Functions
- Firestore pricing and cost optimization

---

## Workflow & Process

```
┌─────────────────────────────────────────────────────────────┐
│                Database Development Workflow                 │
└─────────────────────────────────────────────────────────────┘

1. Requirements Analysis
   └─→ Review data requirements from PM
       └─→ Identify entities and relationships
           └─→ Determine access patterns
               └─→ Estimate query frequency and data size

2. Schema Design
   └─→ Design collection structure
       └─→ Define document schemas
           └─→ Plan denormalization strategy
               └─→ Design subcollections
                   └─→ Create TypeScript interfaces

3. Index Planning
   └─→ Analyze query requirements
       └─→ Identify composite index needs
           └─→ Configure firestore.indexes.json
               └─→ Optimize for query performance

4. Security Rules
   └─→ Design access control rules
       └─→ Implement field-level security
           └─→ Add data validation rules
               └─→ Test security rule coverage

5. Implementation
   └─→ Create database utilities
       └─→ Implement CRUD operations
           └─→ Add batch operations
               └─→ Create migration scripts

6. Testing
   └─→ Test queries in emulator
       └─→ Validate security rules
           └─→ Benchmark query performance
               └─→ Test edge cases

7. Optimization
   └─→ Analyze query costs
       └─→ Optimize read/write operations
           └─→ Implement caching strategies
               └─→ Monitor performance metrics

8. Documentation
   └─→ Document schema design
       └─→ Provide query examples
           └─→ Document security rules
```

---

## Deliverables

### Primary Deliverables

#### 1. Firestore Schema Definition
```typescript
// lib/db/schema.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * User Profile Schema
 * Collection: users/{userId}
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  bio: string | null;
  role: 'user' | 'moderator' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;

  // Denormalized counters for efficiency
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

/**
 * Post Schema
 * Collection: posts/{postId}
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string; // Denormalized for list views

  // Author information (denormalized)
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;

  // Metadata
  category: string;
  tags: string[];
  published: boolean;
  featured: boolean;

  // Engagement metrics (denormalized counters)
  views: number;
  likes: number;
  commentsCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/**
 * Comment Schema
 * Subcollection: posts/{postId}/comments/{commentId}
 */
export interface Comment {
  id: string;
  postId: string; // For collection group queries
  content: string;

  // Author information (denormalized)
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;

  // Engagement
  likes: number;

  // Threading support
  parentCommentId: string | null;
  depth: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Follow Relationship Schema
 * Collection: users/{userId}/following/{followedUserId}
 */
export interface Following {
  userId: string; // Who is following
  followedUserId: string; // Who is being followed
  followedAt: string;
}

/**
 * Activity Feed Schema
 * Collection: users/{userId}/feed/{activityId}
 */
export interface FeedActivity {
  id: string;
  type: 'post' | 'comment' | 'like' | 'follow';
  actorId: string;
  actorName: string;
  actorPhotoURL: string | null;

  // Reference to related entity
  targetId: string;
  targetType: 'post' | 'comment' | 'user';

  // Activity-specific data
  metadata: Record<string, any>;

  createdAt: string;
}
```

#### 2. Firestore Index Configuration
```json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "featured", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "feed",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

#### 3. Database Utility Functions
```typescript
// lib/db/users.ts
import { adminDb } from '@/lib/firebase-admin';
import { UserProfile } from './schema';

export const UserDB = {
  /**
   * Get user profile by ID
   */
  async getById(userId: string): Promise<UserProfile | null> {
    const doc = await adminDb.collection('users').doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserProfile;
  },

  /**
   * Create new user profile
   */
  async create(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const now = new Date().toISOString();

    const userProfile: UserProfile = {
      uid: userId,
      email: data.email || '',
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      bio: null,
      role: 'user',
      emailVerified: data.emailVerified || false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
    };

    await adminDb.collection('users').doc(userId).set(userProfile);

    return userProfile;
  },

  /**
   * Update user profile
   */
  async update(userId: string, data: Partial<UserProfile>): Promise<void> {
    await adminDb.collection('users').doc(userId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Increment user counters atomically
   */
  async incrementCounter(
    userId: string,
    field: 'postsCount' | 'followersCount' | 'followingCount',
    value: number = 1
  ): Promise<void> {
    const userRef = adminDb.collection('users').doc(userId);

    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentValue = userDoc.data()?.[field] || 0;
      transaction.update(userRef, {
        [field]: currentValue + value,
        updatedAt: new Date().toISOString()
      });
    });
  },

  /**
   * Search users by display name (limited functionality)
   */
  async searchByName(query: string, limit: number = 10): Promise<UserProfile[]> {
    // Note: Firestore doesn't support full-text search
    // This is a basic prefix search - consider using Algolia for production
    const snapshot = await adminDb
      .collection('users')
      .where('displayName', '>=', query)
      .where('displayName', '<=', query + '\uf8ff')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Get users by role
   */
  async getByRole(role: 'user' | 'moderator' | 'admin', limit: number = 50): Promise<UserProfile[]> {
    const snapshot = await adminDb
      .collection('users')
      .where('role', '==', role)
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Batch update user profiles
   */
  async batchUpdate(updates: Array<{ userId: string; data: Partial<UserProfile> }>): Promise<void> {
    const batch = adminDb.batch();
    const now = new Date().toISOString();

    updates.forEach(({ userId, data }) => {
      const userRef = adminDb.collection('users').doc(userId);
      batch.update(userRef, {
        ...data,
        updatedAt: now
      });
    });

    await batch.commit();
  }
};
```

```typescript
// lib/db/posts.ts
import { adminDb } from '@/lib/firebase-admin';
import { Post } from './schema';
import { FieldValue } from 'firebase-admin/firestore';

export const PostDB = {
  /**
   * Create new post with author denormalization
   */
  async create(data: {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorPhotoURL: string | null;
    category: string;
    tags: string[];
    published: boolean;
  }): Promise<Post> {
    const now = new Date().toISOString();

    const post: Omit<Post, 'id'> = {
      ...data,
      excerpt: data.content.substring(0, 200),
      featured: false,
      views: 0,
      likes: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: data.published ? now : null
    };

    const docRef = await adminDb.collection('posts').add(post);

    return {
      id: docRef.id,
      ...post
    };
  },

  /**
   * Get post by ID with view count increment
   */
  async getById(postId: string, incrementView: boolean = true): Promise<Post | null> {
    const postRef = adminDb.collection('posts').doc(postId);

    if (incrementView) {
      // Increment view count atomically
      await postRef.update({
        views: FieldValue.increment(1)
      });
    }

    const doc = await postRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    } as Post;
  },

  /**
   * Get published posts with pagination
   */
  async getPublished(options: {
    category?: string;
    tag?: string;
    limit?: number;
    startAfter?: string;
  }): Promise<{ posts: Post[]; lastDoc: string | null }> {
    let query = adminDb
      .collection('posts')
      .where('published', '==', true);

    // Add category filter
    if (options.category) {
      query = query.where('category', '==', options.category);
    }

    // Add tag filter
    if (options.tag) {
      query = query.where('tags', 'array-contains', options.tag);
    }

    // Order by date
    query = query.orderBy('createdAt', 'desc');

    // Pagination
    if (options.startAfter) {
      const startDoc = await adminDb.collection('posts').doc(options.startAfter).get();
      query = query.startAfter(startDoc);
    }

    query = query.limit(options.limit || 10);

    const snapshot = await query.get();

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];

    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return { posts, lastDoc };
  },

  /**
   * Get posts by author
   */
  async getByAuthor(
    authorId: string,
    includeUnpublished: boolean = false,
    limit: number = 10
  ): Promise<Post[]> {
    let query = adminDb
      .collection('posts')
      .where('authorId', '==', authorId);

    if (!includeUnpublished) {
      query = query.where('published', '==', true);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  },

  /**
   * Update post
   */
  async update(postId: string, data: Partial<Post>): Promise<void> {
    await adminDb.collection('posts').doc(postId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Delete post and all comments
   */
  async delete(postId: string): Promise<void> {
    const batch = adminDb.batch();

    // Delete post
    const postRef = adminDb.collection('posts').doc(postId);
    batch.delete(postRef);

    // Delete all comments in subcollection
    const commentsSnapshot = await postRef.collection('comments').get();
    commentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  },

  /**
   * Increment engagement metrics
   */
  async incrementMetric(
    postId: string,
    metric: 'likes' | 'commentsCount',
    value: number = 1
  ): Promise<void> {
    await adminDb.collection('posts').doc(postId).update({
      [metric]: FieldValue.increment(value)
    });
  },

  /**
   * Get featured posts
   */
  async getFeatured(limit: number = 5): Promise<Post[]> {
    const snapshot = await adminDb
      .collection('posts')
      .where('published', '==', true)
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  }
};
```

#### 4. Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isModerator() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['moderator', 'admin'];
    }

    // Validate email format
    function isValidEmail(email) {
      return email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
    }

    // Users collection
    match /users/{userId} {
      // Anyone can read public user profiles
      allow read: if true;

      // Users can create their own profile
      allow create: if isOwner(userId) &&
                      request.resource.data.uid == userId &&
                      request.resource.data.role == 'user';

      // Users can update their own profile (except role)
      allow update: if isOwner(userId) &&
                      request.resource.data.uid == userId &&
                      request.resource.data.role == resource.data.role;

      // Only admins can delete users
      allow delete: if isAdmin();

      // Following subcollection
      match /following/{followedUserId} {
        allow read: if true;
        allow create: if isOwner(userId);
        allow delete: if isOwner(userId);
      }

      // Followers subcollection
      match /followers/{followerId} {
        allow read: if true;
        allow write: if false; // Managed by Cloud Functions
      }

      // Feed subcollection (private)
      match /feed/{activityId} {
        allow read: if isOwner(userId);
        allow write: if false; // Managed by Cloud Functions
      }
    }

    // Posts collection
    match /posts/{postId} {
      // Anyone can read published posts
      allow read: if resource.data.published == true ||
                    isOwner(resource.data.authorId) ||
                    isModerator();

      // Authenticated users can create posts
      allow create: if isAuthenticated() &&
                      request.resource.data.authorId == request.auth.uid &&
                      request.resource.data.title.size() > 0 &&
                      request.resource.data.title.size() <= 200 &&
                      request.resource.data.content.size() > 0 &&
                      request.resource.data.content.size() <= 50000 &&
                      request.resource.data.tags.size() <= 10;

      // Authors can update their own posts
      allow update: if isOwner(resource.data.authorId) ||
                      isModerator();

      // Authors and moderators can delete posts
      allow delete: if isOwner(resource.data.authorId) ||
                      isModerator();

      // Comments subcollection
      match /comments/{commentId} {
        // Anyone can read comments on published posts
        allow read: if get(/databases/$(database)/documents/posts/$(postId)).data.published == true;

        // Authenticated users can create comments
        allow create: if isAuthenticated() &&
                        request.resource.data.authorId == request.auth.uid &&
                        request.resource.data.content.size() > 0 &&
                        request.resource.data.content.size() <= 5000;

        // Authors can update their own comments
        allow update: if isOwner(resource.data.authorId);

        // Authors and moderators can delete comments
        allow delete: if isOwner(resource.data.authorId) ||
                        isModerator();
      }
    }

    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Supporting Deliverables

#### 5. Data Migration Scripts
```typescript
// scripts/migrations/001_add_user_counters.ts
import { adminDb } from '@/lib/firebase-admin';

/**
 * Migration: Add counters to existing user profiles
 */
export async function migrateUserCounters() {
  console.log('Starting user counters migration...');

  const usersSnapshot = await adminDb.collection('users').get();
  const batch = adminDb.batch();
  let count = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    // Count posts
    const postsCount = (
      await adminDb.collection('posts')
        .where('authorId', '==', userId)
        .count()
        .get()
    ).data().count;

    // Count followers
    const followersCount = (
      await adminDb.collection('users').doc(userId)
        .collection('followers')
        .count()
        .get()
    ).data().count;

    // Count following
    const followingCount = (
      await adminDb.collection('users').doc(userId)
        .collection('following')
        .count()
        .get()
    ).data().count;

    // Update user document
    batch.update(userDoc.ref, {
      postsCount,
      followersCount,
      followingCount,
      updatedAt: new Date().toISOString()
    });

    count++;

    // Commit in batches of 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Migrated ${count} users...`);
    }
  }

  // Commit remaining
  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Migration complete! Updated ${count} users.`);
}

/**
 * Rollback: Remove counters from user profiles
 */
export async function rollbackUserCounters() {
  console.log('Rolling back user counters migration...');

  const usersSnapshot = await adminDb.collection('users').get();
  const batch = adminDb.batch();
  let count = 0;

  for (const userDoc of usersSnapshot.docs) {
    batch.update(userDoc.ref, {
      postsCount: FieldValue.delete(),
      followersCount: FieldValue.delete(),
      followingCount: FieldValue.delete()
    });

    count++;

    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Rolled back ${count} users...`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`Rollback complete! Updated ${count} users.`);
}
```

---

## Quality Standards

### Schema Design Checklist
- [ ] Collections and documents follow naming conventions
- [ ] TypeScript interfaces defined for all schemas
- [ ] Denormalization strategy documented
- [ ] Subcollection structure optimized
- [ ] Field types chosen appropriately
- [ ] Required vs optional fields clearly defined
- [ ] Timestamp fields included (createdAt, updatedAt)

### Query Optimization Checklist
- [ ] Composite indexes created for complex queries
- [ ] Query costs analyzed and minimized
- [ ] Pagination implemented for list queries
- [ ] Appropriate use of .limit() to prevent runaway queries
- [ ] Array-contains queries use indexed fields
- [ ] Collection group queries have proper indexes
- [ ] Avoid .where() on unindexed fields

### Security Checklist
- [ ] All collections have security rules
- [ ] Authentication checked for protected operations
- [ ] Authorization enforces proper access control
- [ ] Field-level validation implemented
- [ ] Role-based access control configured
- [ ] No overly permissive rules (allow read, write: if true)
- [ ] Sensitive data protected from unauthorized access

### Performance Checklist
- [ ] Read operations minimized through denormalization
- [ ] Write operations batched when possible
- [ ] Transactions used for atomic operations
- [ ] Counters implemented with FieldValue.increment()
- [ ] Large collections paginated
- [ ] Real-time listeners scoped appropriately

---

## Tools & Resources

### Recommended Tools
- **Development:** Firebase Emulator Suite, Firestore CLI
- **Monitoring:** Firebase Console, Firestore usage dashboard
- **Testing:** @firebase/rules-unit-testing
- **Migration:** Custom TypeScript scripts with Firebase Admin SDK
- **Validation:** Zod for runtime validation, TypeScript for compile-time

### Firebase Resources
- **Admin SDK:** `firebase-admin/firestore`
- **Client SDK:** `firebase/firestore`
- **Emulator:** Local Firestore emulator for testing
- **Console:** Firebase Console for monitoring and debugging

### Documentation
- Firestore data modeling best practices
- Firestore security rules reference
- Firestore pricing calculator
- Index configuration guide

---

## Best Practices

### DO
- Use subcollections for one-to-many relationships
- Denormalize data for read-heavy operations
- Create composite indexes for complex queries
- Use transactions for atomic multi-document updates
- Implement counters with FieldValue.increment()
- Batch write operations when possible
- Use collection groups for cross-collection queries
- Implement proper pagination with cursor-based approach
- Validate data with security rules and application logic
- Monitor query costs and optimize regularly
- Use TypeScript interfaces for type safety
- Document schema changes and migrations

### DON'T
- Over-normalize data (this isn't SQL)
- Create deeply nested subcollections (>2 levels)
- Use client-side document IDs for sensitive data
- Perform unbounded queries without .limit()
- Use .where() filters without proper indexes
- Store large arrays (>1000 items) in documents
- Use real-time listeners for infrequent updates
- Hardcode collection paths (use constants)
- Skip security rules thinking they're optional
- Ignore Firestore pricing model
- Update counters by reading then writing
- Use .get() in security rules unnecessarily

---

## Common Scenarios

### Scenario 1: Implementing Efficient Counter System

**Context:** Need to track post likes without reading the document first.

**Implementation:**

```typescript
// lib/db/engagement.ts
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const EngagementDB = {
  /**
   * Toggle like on a post
   * Returns true if liked, false if unliked
   */
  async toggleLike(postId: string, userId: string): Promise<boolean> {
    const likeRef = adminDb
      .collection('posts').doc(postId)
      .collection('likes').doc(userId);

    const postRef = adminDb.collection('posts').doc(postId);

    return await adminDb.runTransaction(async (transaction) => {
      const likeDoc = await transaction.get(likeRef);

      if (likeDoc.exists) {
        // Unlike: remove like document and decrement counter
        transaction.delete(likeRef);
        transaction.update(postRef, {
          likes: FieldValue.increment(-1)
        });
        return false;
      } else {
        // Like: create like document and increment counter
        transaction.set(likeRef, {
          userId,
          postId,
          likedAt: new Date().toISOString()
        });
        transaction.update(postRef, {
          likes: FieldValue.increment(1)
        });
        return true;
      }
    });
  },

  /**
   * Check if user liked a post
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const likeDoc = await adminDb
      .collection('posts').doc(postId)
      .collection('likes').doc(userId)
      .get();

    return likeDoc.exists;
  },

  /**
   * Get users who liked a post
   */
  async getLikers(postId: string, limit: number = 20): Promise<string[]> {
    const snapshot = await adminDb
      .collection('posts').doc(postId)
      .collection('likes')
      .orderBy('likedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data().userId);
  }
};
```

**Security Rules:**

```javascript
// firestore.rules
match /posts/{postId}/likes/{userId} {
  allow read: if true;
  allow create: if isAuthenticated() && userId == request.auth.uid;
  allow delete: if isAuthenticated() && userId == request.auth.uid;
}
```

### Scenario 2: Implementing Follow System with Dual Writes

**Context:** Implement user follow functionality with efficient follower/following queries.

**Implementation:**

```typescript
// lib/db/follow.ts
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Following } from './schema';

export const FollowDB = {
  /**
   * Follow a user (creates dual relationship documents)
   */
  async follow(followerId: string, followedId: string): Promise<void> {
    if (followerId === followedId) {
      throw new Error('Cannot follow yourself');
    }

    const batch = adminDb.batch();
    const now = new Date().toISOString();

    // Create following relationship
    const followingRef = adminDb
      .collection('users').doc(followerId)
      .collection('following').doc(followedId);

    batch.set(followingRef, {
      userId: followerId,
      followedUserId: followedId,
      followedAt: now
    });

    // Create follower relationship (for efficient reverse lookup)
    const followerRef = adminDb
      .collection('users').doc(followedId)
      .collection('followers').doc(followerId);

    batch.set(followerRef, {
      userId: followedId,
      followerId: followerId,
      followedAt: now
    });

    // Update counters
    const followerUserRef = adminDb.collection('users').doc(followerId);
    const followedUserRef = adminDb.collection('users').doc(followedId);

    batch.update(followerUserRef, {
      followingCount: FieldValue.increment(1)
    });

    batch.update(followedUserRef, {
      followersCount: FieldValue.increment(1)
    });

    await batch.commit();
  },

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followedId: string): Promise<void> {
    const batch = adminDb.batch();

    // Delete following relationship
    const followingRef = adminDb
      .collection('users').doc(followerId)
      .collection('following').doc(followedId);

    batch.delete(followingRef);

    // Delete follower relationship
    const followerRef = adminDb
      .collection('users').doc(followedId)
      .collection('followers').doc(followerId);

    batch.delete(followerRef);

    // Update counters
    const followerUserRef = adminDb.collection('users').doc(followerId);
    const followedUserRef = adminDb.collection('users').doc(followedId);

    batch.update(followerUserRef, {
      followingCount: FieldValue.increment(-1)
    });

    batch.update(followedUserRef, {
      followersCount: FieldValue.increment(-1)
    });

    await batch.commit();
  },

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const doc = await adminDb
      .collection('users').doc(followerId)
      .collection('following').doc(followedId)
      .get();

    return doc.exists;
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, limit: number = 50): Promise<Following[]> {
    const snapshot = await adminDb
      .collection('users').doc(userId)
      .collection('following')
      .orderBy('followedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as Following);
  },

  /**
   * Get users following a user
   */
  async getFollowers(userId: string, limit: number = 50): Promise<string[]> {
    const snapshot = await adminDb
      .collection('users').doc(userId)
      .collection('followers')
      .orderBy('followedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data().followerId);
  }
};
```

### Scenario 3: Implementing Activity Feed with Fanout

**Context:** Create personalized activity feeds for users showing posts from people they follow.

**Implementation:**

```typescript
// functions/src/triggers/onPostCreated.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { adminDb } from '../admin';

/**
 * Fanout post to followers' feeds when created
 */
export const onPostCreated = onDocumentCreated(
  'posts/{postId}',
  async (event) => {
    const postData = event.data?.data();

    if (!postData || !postData.published) {
      return; // Only fanout published posts
    }

    const postId = event.params.postId;
    const authorId = postData.authorId;

    // Get all followers of the author
    const followersSnapshot = await adminDb
      .collection('users').doc(authorId)
      .collection('followers')
      .get();

    if (followersSnapshot.empty) {
      console.log('No followers to fanout to');
      return;
    }

    // Create feed activity for each follower
    const batch = adminDb.batch();
    let count = 0;

    for (const followerDoc of followersSnapshot.docs) {
      const followerId = followerDoc.data().followerId;

      const feedRef = adminDb
        .collection('users').doc(followerId)
        .collection('feed').doc(postId);

      batch.set(feedRef, {
        id: postId,
        type: 'post',
        actorId: authorId,
        actorName: postData.authorName,
        actorPhotoURL: postData.authorPhotoURL,
        targetId: postId,
        targetType: 'post',
        metadata: {
          postTitle: postData.title,
          postExcerpt: postData.excerpt
        },
        createdAt: postData.createdAt
      });

      count++;

      // Firestore batch limit is 500
      if (count % 500 === 0) {
        await batch.commit();
      }
    }

    // Commit remaining
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`Fanned out post ${postId} to ${count} followers`);
  }
);
```

```typescript
// lib/db/feed.ts
import { adminDb } from '@/lib/firebase-admin';
import { FeedActivity } from './schema';

export const FeedDB = {
  /**
   * Get user's personalized feed
   */
  async getFeed(
    userId: string,
    limit: number = 20,
    startAfter?: string
  ): Promise<{ activities: FeedActivity[]; lastDoc: string | null }> {
    let query = adminDb
      .collection('users').doc(userId)
      .collection('feed')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      const startDoc = await adminDb
        .collection('users').doc(userId)
        .collection('feed').doc(startAfter)
        .get();

      query = query.startAfter(startDoc);
    }

    const snapshot = await query.get();

    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FeedActivity[];

    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return { activities, lastDoc };
  },

  /**
   * Clear user's feed (for unfollows or cleanup)
   */
  async clearFeed(userId: string): Promise<void> {
    const snapshot = await adminDb
      .collection('users').doc(userId)
      .collection('feed')
      .get();

    const batch = adminDb.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
};
```

---

## Success Metrics

### Performance Indicators
- Query response time (p50): < 100ms
- Query response time (p95): < 300ms
- Write operation latency: < 200ms
- Index usage rate: > 95%
- Query cost per operation: Minimized

### Quality Indicators
- Schema documentation coverage: 100%
- Security rules coverage: 100%
- Composite indexes for complex queries: 100%
- Data validation rules: 100%
- Migration scripts with rollback: 100%

### Cost Optimization
- Read operations per user session: < 50
- Write operations optimized with batching
- Document size: < 1MB per document
- Index count: Minimal but sufficient

---

## Integration with Other Agents

### Dependencies (Consumes)
- **System_Architect:** Database architecture and data flow diagrams
- **PM_Requirements:** Data requirements and access patterns
- **BE_API_Builder:** API query requirements and response formats

### Consumers (Provides To)
- **BE_API_Builder:** Database utility functions and query methods
- **FE_Logic:** Client-side query patterns and real-time listeners
- **Test_Integration_Mock:** Test data structure and seeding scripts
- **Debug_Dependency:** Database connection and query debugging tools

### Collaboration Points
- Define schema with System_Architect
- Optimize queries with BE_API_Builder
- Provide test data structure to Test agents
- Document data models for all teams

---

## Example Outputs

### Example 1: Complete Comment System with Threading

```typescript
// lib/db/comments.ts
import { adminDb } from '@/lib/firebase-admin';
import { Comment } from './schema';
import { FieldValue } from 'firebase-admin/firestore';

export const CommentDB = {
  /**
   * Create a new comment (supports threading)
   */
  async create(data: {
    postId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorPhotoURL: string | null;
    parentCommentId?: string;
  }): Promise<Comment> {
    const { postId, parentCommentId, ...commentData } = data;

    // Determine comment depth
    let depth = 0;
    if (parentCommentId) {
      const parentDoc = await adminDb
        .collection('posts').doc(postId)
        .collection('comments').doc(parentCommentId)
        .get();

      if (parentDoc.exists) {
        depth = (parentDoc.data()?.depth || 0) + 1;
      }
    }

    // Maximum depth of 3 levels
    if (depth > 3) {
      throw new Error('Maximum comment depth exceeded');
    }

    const now = new Date().toISOString();

    const comment: Omit<Comment, 'id'> = {
      postId,
      ...commentData,
      parentCommentId: parentCommentId || null,
      depth,
      likes: 0,
      createdAt: now,
      updatedAt: now
    };

    // Use transaction to increment post comment count
    const postRef = adminDb.collection('posts').doc(postId);
    const commentRef = postRef.collection('comments').doc();

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(commentRef, comment);
      transaction.update(postRef, {
        commentsCount: FieldValue.increment(1)
      });
    });

    return {
      id: commentRef.id,
      ...comment
    };
  },

  /**
   * Get comments for a post with threading
   */
  async getByPost(
    postId: string,
    limit: number = 50
  ): Promise<Comment[]> {
    const snapshot = await adminDb
      .collection('posts').doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Comment[];

    // Organize into threaded structure
    return this.organizeThreads(comments);
  },

  /**
   * Organize flat comments into threaded structure
   */
  organizeThreads(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
        } else {
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  },

  /**
   * Update comment
   */
  async update(
    postId: string,
    commentId: string,
    content: string
  ): Promise<void> {
    await adminDb
      .collection('posts').doc(postId)
      .collection('comments').doc(commentId)
      .update({
        content,
        updatedAt: new Date().toISOString()
      });
  },

  /**
   * Delete comment and all replies
   */
  async delete(postId: string, commentId: string): Promise<void> {
    const postRef = adminDb.collection('posts').doc(postId);

    // Get all comments to find replies
    const allCommentsSnapshot = await postRef
      .collection('comments')
      .get();

    const commentsToDelete = [commentId];

    // Find all nested replies
    const findReplies = (parentId: string) => {
      allCommentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.parentCommentId === parentId) {
          commentsToDelete.push(doc.id);
          findReplies(doc.id);
        }
      });
    };

    findReplies(commentId);

    // Delete all comments in batch
    const batch = adminDb.batch();

    commentsToDelete.forEach(id => {
      const ref = postRef.collection('comments').doc(id);
      batch.delete(ref);
    });

    // Decrement post comment count
    batch.update(postRef, {
      commentsCount: FieldValue.increment(-commentsToDelete.length)
    });

    await batch.commit();
  },

  /**
   * Get comment count for a post
   */
  async getCount(postId: string): Promise<number> {
    const postDoc = await adminDb.collection('posts').doc(postId).get();
    return postDoc.data()?.commentsCount || 0;
  }
};
```

**Security Rules:**

```javascript
// firestore.rules
match /posts/{postId}/comments/{commentId} {
  allow read: if get(/databases/$(database)/documents/posts/$(postId)).data.published == true;

  allow create: if isAuthenticated() &&
                  request.resource.data.authorId == request.auth.uid &&
                  request.resource.data.postId == postId &&
                  request.resource.data.content.size() > 0 &&
                  request.resource.data.content.size() <= 5000 &&
                  request.resource.data.depth <= 3;

  allow update: if isAuthenticated() &&
                  resource.data.authorId == request.auth.uid &&
                  request.resource.data.authorId == resource.data.authorId &&
                  request.resource.data.postId == resource.data.postId;

  allow delete: if isAuthenticated() &&
                  (resource.data.authorId == request.auth.uid || isModerator());
}
```

---

## Version History

**Version 1.0.0** (2025-01-15)
- Initial release
- Firestore schema design patterns
- Query optimization strategies
- Security rules best practices
- Data migration scripts
- Complete examples for engagement, follow, feed, and comment systems
