import { db } from './index.ts';
import { users, orders } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name: string = 'FUDORA Member') {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user account. Please try again later.', { cause: error });
  }
}

export async function getUserOrdersByUid(uid: string) {
  try {
    const rows = await db
      .select({
        id: orders.id,
        orderCode: orders.orderCode,
        itemsSummary: orders.itemsSummary,
        totalCostInr: orders.totalCostInr,
        deliveryDate: orders.deliveryDate,
        status: orders.status,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(orders.id));

    return rows;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createUserOrderForUid(
  uid: string,
  email: string,
  orderInput: {
    orderCode: string;
    itemsSummary: string;
    totalCostInr: number;
    deliveryDate: string;
    status: string;
  }
) {
  try {
    const userRecord = await getOrCreateUser(uid, email);
    const inserted = await db
      .insert(orders)
      .values({
        orderCode: orderInput.orderCode,
        userId: userRecord.id,
        itemsSummary: orderInput.itemsSummary,
        totalCostInr: orderInput.totalCostInr,
        deliveryDate: orderInput.deliveryDate,
        status: orderInput.status,
      })
      .onConflictDoUpdate({
        target: orders.orderCode,
        set: {
          status: orderInput.status,
          totalCostInr: orderInput.totalCostInr,
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database order insert failed:', error);
    throw new Error('Failed to record order in database. Please try again later.', { cause: error });
  }
}
