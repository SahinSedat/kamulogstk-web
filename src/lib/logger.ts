import { AuditAction } from '@prisma/client'
import prisma from './prisma'
import { headers } from 'next/headers'

export interface AuditLogData {
    action: AuditAction
    entityType: string
    entityId?: string
    userId?: string
    userEmail?: string
    userName?: string
    description?: string
    oldData?: Record<string, unknown>
    newData?: Record<string, unknown>
    metadata?: Record<string, unknown>
    stkId?: string
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
    try {
        const headersList = await headers()
        const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        await prisma.auditLog.create({
            data: {
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                userId: data.userId,
                userEmail: data.userEmail,
                userName: data.userName,
                description: data.description,
                oldData: data.oldData ? JSON.parse(JSON.stringify(data.oldData)) : undefined,
                newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : undefined,
                metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
                stkId: data.stkId,
                ipAddress,
                userAgent,
            }
        })
    } catch (error) {
        console.error('Failed to create audit log:', error)
        // Don't throw - audit logging shouldn't break the main flow
    }
}

// Helper functions for common audit actions
export async function logUserLogin(userId: string, email: string, name: string): Promise<void> {
    await createAuditLog({
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: userId,
        userId,
        userEmail: email,
        userName: name,
        description: `${name} sisteme giriş yaptı`
    })
}

export async function logUserLogout(userId: string, email: string, name: string): Promise<void> {
    await createAuditLog({
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        userId,
        userEmail: email,
        userName: name,
        description: `${name} sistemden çıkış yaptı`
    })
}

export async function logSTKApproval(
    stkId: string,
    stkName: string,
    userId: string,
    userEmail: string,
    userName: string
): Promise<void> {
    await createAuditLog({
        action: 'STK_APPROVE',
        entityType: 'STK',
        entityId: stkId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${stkName} STK başvurusu onaylandı`
    })
}

export async function logSTKRejection(
    stkId: string,
    stkName: string,
    userId: string,
    userEmail: string,
    userName: string,
    reason: string
): Promise<void> {
    await createAuditLog({
        action: 'STK_REJECT',
        entityType: 'STK',
        entityId: stkId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${stkName} STK başvurusu reddedildi`,
        metadata: { rejectionReason: reason }
    })
}

export async function logMemberApproval(
    memberId: string,
    memberName: string,
    stkId: string,
    userId: string,
    userEmail: string,
    userName: string,
    boardDecision: { number: string; date: Date }
): Promise<void> {
    await createAuditLog({
        action: 'MEMBER_APPROVE',
        entityType: 'Member',
        entityId: memberId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${memberName} üyelik başvurusu onaylandı`,
        metadata: {
            boardDecisionNumber: boardDecision.number,
            boardDecisionDate: boardDecision.date.toISOString()
        }
    })
}

export async function logMemberRejection(
    memberId: string,
    memberName: string,
    stkId: string,
    userId: string,
    userEmail: string,
    userName: string,
    reason: string
): Promise<void> {
    await createAuditLog({
        action: 'MEMBER_REJECT',
        entityType: 'Member',
        entityId: memberId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${memberName} üyelik başvurusu reddedildi`,
        metadata: { rejectionReason: reason }
    })
}

export async function logMemberResignation(
    memberId: string,
    memberName: string,
    stkId: string,
    userId: string,
    userEmail: string,
    userName: string
): Promise<void> {
    await createAuditLog({
        action: 'MEMBER_RESIGN',
        entityType: 'Member',
        entityId: memberId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${memberName} istifa talebi onaylandı`
    })
}

export async function logPaymentConfirmation(
    paymentId: string,
    amount: number,
    memberId: string | null,
    stkId: string,
    userId: string,
    userEmail: string,
    userName: string
): Promise<void> {
    await createAuditLog({
        action: 'PAYMENT_CONFIRM',
        entityType: 'Payment',
        entityId: paymentId,
        userId,
        userEmail,
        userName,
        stkId,
        description: `${amount} TL tutarında ödeme onaylandı`,
        metadata: { memberId }
    })
}

// Query functions for admin panel
export async function getAuditLogs(params: {
    page?: number
    pageSize?: number
    action?: AuditAction
    entityType?: string
    userId?: string
    stkId?: string
    startDate?: Date
    endDate?: Date
}): Promise<{
    logs: Awaited<ReturnType<typeof prisma.auditLog.findMany>>
    total: number
    page: number
    pageSize: number
    totalPages: number
}> {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const skip = (page - 1) * pageSize

    const where = {
        ...(params.action && { action: params.action }),
        ...(params.entityType && { entityType: params.entityType }),
        ...(params.userId && { userId: params.userId }),
        ...(params.stkId && { stkId: params.stkId }),
        ...(params.startDate || params.endDate ? {
            createdAt: {
                ...(params.startDate && { gte: params.startDate }),
                ...(params.endDate && { lte: params.endDate }),
            }
        } : {}),
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
        }),
        prisma.auditLog.count({ where })
    ])

    return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}
