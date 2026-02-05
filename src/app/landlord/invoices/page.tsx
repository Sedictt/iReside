"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Loader2,
    Receipt,
    X,
    Calendar,
    DollarSign,
    User,
    FileText
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./invoices.module.css";

type Invoice = {
    id: string;
    tenant_name: string;
    tenant_email: string | null;
    description: string | null;
    amount: number;
    due_date: string;
    status: 'paid' | 'pending' | 'overdue';
    created_at: string;
    unit_id: string | null;
};

type Unit = {
    id: string;
    unit_number: string;
    property_id: string;
};

type PaymentSubmission = {
    id: string;
    invoice_id: string;
    tenant_id: string;
    tenant_email: string | null;
    amount: number;
    reference_number: string | null;
    receipt_url: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    invoice?: {
        id: string;
        tenant_name: string;
        tenant_email: string | null;
        description: string | null;
        amount: number;
        due_date: string;
    } | null;
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [newInvoice, setNewInvoice] = useState({
        tenant_name: '',
        tenant_email: '',
        description: '',
        amount: '',
        due_date: '',
        unit_id: ''
    });

    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoading(false);
            return;
        }

        // Fetch invoices
        const { data: invoicesData } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: paymentData } = await supabase
            .from('payment_submissions')
            .select('*, invoice:invoices(id, tenant_name, tenant_email, description, amount, due_date)')
            .order('created_at', { ascending: false });

        // Fetch units for dropdown
        const { data: properties } = await supabase
            .from('properties')
            .select('id, units(id, unit_number, property_id)');

        if (invoicesData) {
            // Check for overdue invoices
            const today = new Date().toISOString().split('T')[0];
            const updatedInvoices = invoicesData.map(inv => ({
                ...inv,
                status: inv.status === 'pending' && inv.due_date < today ? 'overdue' : inv.status
            }));
            setInvoices(updatedInvoices as Invoice[]);
        }

        if (properties) {
            const allUnits: Unit[] = [];
            properties.forEach((p: { units?: Unit[] }) => {
                if (p.units) {
                    allUnits.push(...p.units);
                }
            });
            setUnits(allUnits);
        }

        if (paymentData) {
            setPaymentSubmissions(paymentData as PaymentSubmission[]);
        }

        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateInvoice = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('invoices').insert({
            landlord_id: user.id,
            tenant_name: newInvoice.tenant_name,
            tenant_email: newInvoice.tenant_email || null,
            description: newInvoice.description || null,
            amount: parseFloat(newInvoice.amount),
            due_date: newInvoice.due_date,
            unit_id: newInvoice.unit_id || null,
            status: 'pending'
        });

        if (!error) {
            setShowModal(false);
            setNewInvoice({
                tenant_name: '',
                tenant_email: '',
                description: '',
                amount: '',
                due_date: '',
                unit_id: ''
            });
            fetchData();
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'paid' | 'pending' | 'overdue') => {
        const updates: { status: string; paid_at?: string | null } = { status: newStatus };
        if (newStatus === 'paid') {
            updates.paid_at = new Date().toISOString();
        } else {
            updates.paid_at = null;
        }

        await supabase.from('invoices').update(updates).eq('id', id);
        fetchData();
    };

    const handleReviewSubmission = async (submission: PaymentSubmission, action: 'approved' | 'rejected') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('payment_submissions')
            .update({
                status: action,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', submission.id);

        if (action === 'approved') {
            await supabase
                .from('invoices')
                .update({ status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', submission.invoice_id);
        }

        fetchData();
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesFilter = filter === 'all' || inv.status === filter;
        const matchesSearch = inv.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.description?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        pending: invoices.filter(i => i.status === 'pending').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        totalAmount: invoices.reduce((sum, i) => sum + Number(i.amount), 0),
        paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0)
    };

    if (isLoading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading invoices...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Invoices</h1>
                    <p className={styles.subtitle}>Manage billing and payments</p>
                </div>
                <button className={styles.addBtn} onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Create Invoice
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Invoices</span>
                    <span className={styles.statValue}>{stats.total}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Amount</span>
                    <span className={styles.statValue}>₱{stats.totalAmount.toLocaleString()}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Collected</span>
                    <span className={`${styles.statValue} ${styles.green}`}>₱{stats.paidAmount.toLocaleString()}</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Outstanding</span>
                    <span className={`${styles.statValue} ${styles.red}`}>
                        ₱{(stats.totalAmount - stats.paidAmount).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Payment Submissions */}
            <div className={styles.paymentsCard}>
                <div className={styles.paymentsHeader}>
                    <div>
                        <h2 className={styles.paymentsTitle}>Payment Submissions</h2>
                        <p className={styles.paymentsSubtitle}>Review tenant payment receipts</p>
                    </div>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tenant</th>
                                <th>Invoice</th>
                                <th>Amount</th>
                                <th>Reference</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentSubmissions.length > 0 ? (
                                paymentSubmissions.map(submission => (
                                    <tr key={submission.id}>
                                        <td>
                                            <div className={styles.tenantCell}>
                                                <div className={styles.avatar}>
                                                    {(submission.invoice?.tenant_name || submission.tenant_email || 'T')[0]}
                                                </div>
                                                <div>
                                                    <span className={styles.tenantName}>{submission.invoice?.tenant_name || 'Tenant'}</span>
                                                    {submission.tenant_email && (
                                                        <span className={styles.tenantEmail}>{submission.tenant_email}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.invoiceId}>
                                                <Receipt size={16} />
                                                #{submission.invoice_id.slice(0, 8).toUpperCase()}
                                            </div>
                                            <div className={styles.submissionMeta}>
                                                {submission.invoice?.description || 'Rent Payment'}
                                            </div>
                                        </td>
                                        <td className={styles.amount}>₱{Number(submission.amount).toLocaleString()}</td>
                                        <td>{submission.reference_number || '-'}</td>
                                        <td>{new Date(submission.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span
                                                className={`${styles.reviewBadge} ${submission.status === 'approved'
                                                    ? styles.reviewBadgeApproved
                                                    : submission.status === 'rejected'
                                                        ? styles.reviewBadgeRejected
                                                        : styles.reviewBadgePending}`}
                                            >
                                                {submission.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.reviewActions}>
                                                <a
                                                    className={styles.receiptLink}
                                                    href={submission.receipt_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View Receipt
                                                </a>
                                                {submission.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className={styles.approveBtn}
                                                            onClick={() => handleReviewSubmission(submission, 'approved')}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className={styles.rejectBtn}
                                                            onClick={() => handleReviewSubmission(submission, 'rejected')}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className={styles.emptyRow}>
                                        No payment submissions yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    {(['all', 'paid', 'pending', 'overdue'] as const).map(f => (
                        <button
                            key={f}
                            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f !== 'all' && (
                                <span className={styles.filterCount}>
                                    {f === 'paid' ? stats.paid : f === 'pending' ? stats.pending : stats.overdue}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoice Table */}
            <div className={styles.card}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Tenant</th>
                                <th>Description</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice, index) => (
                                    <motion.tr
                                        key={invoice.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <td>
                                            <div className={styles.invoiceId}>
                                                <Receipt size={16} />
                                                #{invoice.id.slice(0, 8).toUpperCase()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.tenantCell}>
                                                <div className={styles.avatar}>{invoice.tenant_name[0]}</div>
                                                <div>
                                                    <span className={styles.tenantName}>{invoice.tenant_name}</span>
                                                    {invoice.tenant_email && (
                                                        <span className={styles.tenantEmail}>{invoice.tenant_email}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{invoice.description || '-'}</td>
                                        <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                                        <td className={styles.amount}>₱{Number(invoice.amount).toLocaleString()}</td>
                                        <td>
                                            <select
                                                className={`${styles.statusSelect} ${styles[invoice.status]}`}
                                                value={invoice.status}
                                                onChange={(e) => handleStatusChange(invoice.id, e.target.value as Invoice['status'])}
                                            >
                                                <option value="paid">Paid</option>
                                                <option value="pending">Pending</option>
                                                <option value="overdue">Overdue</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button className={styles.moreBtn}>
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className={styles.emptyRow}>
                                        <Receipt size={32} />
                                        <p>No invoices found</p>
                                        <span>Create your first invoice to get started</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Invoice Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            className={styles.modal}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.modalHeader}>
                                <h2>Create Invoice</h2>
                                <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label><User size={16} /> Tenant Name *</label>
                                    <input
                                        type="text"
                                        value={newInvoice.tenant_name}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, tenant_name: e.target.value })}
                                        placeholder="Enter tenant name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Tenant Email</label>
                                    <input
                                        type="email"
                                        value={newInvoice.tenant_email}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, tenant_email: e.target.value })}
                                        placeholder="tenant@email.com"
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label><DollarSign size={16} /> Amount *</label>
                                        <input
                                            type="number"
                                            value={newInvoice.amount}
                                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label><Calendar size={16} /> Due Date *</label>
                                        <input
                                            type="date"
                                            value={newInvoice.due_date}
                                            onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label><FileText size={16} /> Description</label>
                                    <textarea
                                        value={newInvoice.description}
                                        onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                                        placeholder="Monthly rent, utilities, etc."
                                        rows={3}
                                    />
                                </div>
                                {units.length > 0 && (
                                    <div className={styles.formGroup}>
                                        <label>Link to Unit (Optional)</label>
                                        <select
                                            value={newInvoice.unit_id}
                                            onChange={(e) => setNewInvoice({ ...newInvoice, unit_id: e.target.value })}
                                        >
                                            <option value="">Select a unit</option>
                                            {units.map(unit => (
                                                <option key={unit.id} value={unit.id}>
                                                    Unit {unit.unit_number}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className={styles.submitBtn}
                                    onClick={handleCreateInvoice}
                                    disabled={!newInvoice.tenant_name || !newInvoice.amount || !newInvoice.due_date}
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
