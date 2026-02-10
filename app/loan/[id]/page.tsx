'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Modal, Input, message } from 'antd'
import { supabase } from '@/lib/supabaseClient'
import type { StaffUser, Loan, LoanAttachment } from '@/lib/types'
import { formatNum, formatDate } from '@/lib/types'

export default function LoanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [user, setUser] = useState<StaffUser | null>(null)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentModal, setCommentModal] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [previewFile, setPreviewFile] = useState<{ url: string; fileName: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('loan_user')
    if (!stored) {
      router.replace('/')
      return
    }
    try {
      setUser(JSON.parse(stored) as StaffUser)
    } catch {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    if (!id) return
    const fetchLoan = async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*, loan_attachments(*)')
        .eq('id', id)
        .single()
      if (error || !data) {
        setLoan(null)
        setLoading(false)
        return
      }
      setLoan(data as Loan)
      setLoading(false)
    }
    fetchLoan()
  }, [id])

  const handleApprove = () => {
    if (!user) return
    setComment('')
    setCommentModal('approve')
  }

  const handleReject = () => {
    if (!user) return
    setComment('')
    setCommentModal('reject')
  }

  const submitCommentModal = async () => {
    if (!user || !commentModal) return
    setModalLoading(true)
    try {
      await supabase
        .from('loans')
        .update({
          status: commentModal === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ',
          approver_name: user.name,
          approver_comment: comment?.trim() || null,
        })
        .eq('id', id)
      message.success(commentModal === 'approve' ? 'อนุมัติเคสเรียบร้อย' : 'บันทึกการปฏิเสธเรียบร้อย')
      setCommentModal(null)
      router.push('/')
      router.refresh()
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    if (!loan?.loan_attachments?.length) return
    const attachments = loan.loan_attachments as LoanAttachment[]
    const loadUrls = async () => {
      const map: Record<string, string> = {}
      for (const att of attachments) {
        const { data } = await supabase.storage.from('loan-docs').createSignedUrl(att.file_path, 3600)
        if (data?.signedUrl) {
          map[att.file_path] = data.signedUrl
        } else {
          const { data: pub } = supabase.storage.from('loan-docs').getPublicUrl(att.file_path)
          map[att.file_path] = pub?.publicUrl ?? '#'
        }
      }
      setFileUrls((prev) => ({ ...prev, ...map }))
    }
    loadUrls()
  }, [loan?.id, loan?.loan_attachments])

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)
  const isPdf = (name: string) => /\.pdf$/i.test(name)

  if (user == null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBE437]">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBE437]">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] bg-[#FBE437]">
        <p className="text-gray-500 text-sm sm:text-base">ไม่พบรายการนี้</p>
        <Link href="/" className="text-red-700 hover:underline mt-2 inline-block py-2 touch-manipulation">
          ← กลับหน้ารายการ
        </Link>
      </div>
    )
  }

  if (user.role === 'sale' && loan.sale_id !== user.id) {
    return (
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] bg-[#FBE437]">
        <p className="text-gray-500 text-sm sm:text-base">ไม่มีสิทธิ์ดูรายการนี้</p>
        <Link href="/" className="text-red-700 hover:underline mt-2 inline-block py-2 touch-manipulation">
          ← กลับหน้ารายการ
        </Link>
      </div>
    )
  }

  const attachments = (loan.loan_attachments ?? []) as LoanAttachment[]
  const canApprove = user.role === 'approver' && loan.status === 'รอตรวจสอบ'

  return (
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437] pb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700">รายละเอียดเคส</h1>
        <Link href="/" className="text-red-700 hover:underline py-2 -my-2 touch-manipulation">
          ← กลับหน้ารายการ
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">ข้อมูลผู้กู้</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">ชื่อ-นามสกุล</dt>
            <dd className="text-gray-900">{loan.customer_name ?? '—'}</dd>
            <dt className="text-gray-500">เลขบัตรประชาชน</dt>
            <dd className="text-gray-900">{loan.id_card_number ?? '—'}</dd>
            <dt className="text-gray-500">วันเกิด</dt>
            <dd className="text-gray-900">{formatDate(loan.birth_date)}</dd>
          </dl>
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">ข้อมูลรถ</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">ยี่ห้อ</dt>
            <dd className="text-gray-900">{loan.car_brand ?? '—'}</dd>
            <dt className="text-gray-500">รุ่น</dt>
            <dd className="text-gray-900">{loan.car_model ?? '—'}</dd>
            <dt className="text-gray-500">ลักษณะรถ</dt>
            <dd className="text-gray-900">{loan.car_type ?? '—'}</dd>
            <dt className="text-gray-500">วันที่จดทะเบียน</dt>
            <dd className="text-gray-900">{formatDate(loan.registration_date)}</dd>
            <dt className="text-gray-500">เลขทะเบียน</dt>
            <dd className="text-gray-900">{loan.license_plate ?? '—'}</dd>
            <dt className="text-gray-500">รายละเอียด/ตำหนิ</dt>
            <dd className="text-gray-900 col-span-2">{loan.car_details ?? '—'}</dd>
          </dl>
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">ข้อมูลสินเชื่อ</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">วันที่เสนอเคส</dt>
            <dd className="text-gray-900">{formatDate(loan.submission_date)}</dd>
            <dt className="text-gray-500">พนักงานขาย</dt>
            <dd className="text-gray-900">{loan.sales_name ?? '—'}</dd>
            <dt className="text-gray-500">ยอดจัดที่ขอ</dt>
            <dd className="text-gray-900">{formatNum(loan.loan_amount)}</dd>
            <dt className="text-gray-500">ยอดปิดบัญชีเดิม</dt>
            <dd className="text-gray-900">{formatNum(loan.closing_amount)}</dd>
            <dt className="text-gray-500">จำนวนงวด (เดือน)</dt>
            <dd className="text-gray-900">{loan.term_months ?? '—'}</dd>
            <dt className="text-gray-500">อัตราดอกเบี้ย (%)</dt>
            <dd className="text-gray-900">{loan.interest_rate ?? '—'}</dd>
            <dt className="text-gray-500">สถานะ</dt>
            <dd>
              <span
                className={`font-bold ${
                  loan.status === 'อนุมัติ' ? 'text-green-600' : loan.status === 'ปฏิเสธ' ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                {loan.status ?? '—'}
              </span>
            </dd>
            {loan.approver_name && (
              <>
                <dt className="text-gray-500">ผู้อนุมัติ/ปฏิเสธ</dt>
                <dd className="text-gray-900">{loan.approver_name}</dd>
              </>
            )}
            {loan.approver_comment != null && loan.approver_comment !== '' && (
              <>
                <dt className="text-gray-500">ความเห็น</dt>
                <dd className="text-gray-900 col-span-2">{loan.approver_comment}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="p-4 sm:p-6">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">เอกสารแนบ</h2>
          {attachments.length === 0 ? (
            <p className="text-gray-500 text-sm">ไม่มีไฟล์แนบ</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => {
                const url = fileUrls[att.file_path]
                return (
                  <li key={att.id}>
                    {url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url, fileName: att.file_name })}
                        className="text-red-700 hover:underline py-2 inline-block min-h-[44px] flex items-center break-all text-left w-full"
                      >
                        {att.file_name} (เปิดดู)
                      </button>
                    ) : (
                      <span className="text-gray-500 py-2 inline-block">{att.file_name} (กำลังโหลดลิงก์…)</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {canApprove && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleApprove}
            className="bg-red-700 text-white px-4 py-3.5 sm:py-2 rounded-lg hover:bg-red-800 min-h-[48px] font-medium touch-manipulation"
          >
            อนุมัติ
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="bg-gray-600 text-white px-4 py-3.5 sm:py-2 rounded-lg hover:bg-gray-700 min-h-[48px] font-medium touch-manipulation"
          >
            ปฏิเสธ
          </button>
        </div>
      )}

      <Modal
        title={commentModal === 'approve' ? 'อนุมัติเคส' : 'ปฏิเสธเคส'}
        open={commentModal != null}
        onOk={submitCommentModal}
        onCancel={() => setCommentModal(null)}
        confirmLoading={modalLoading}
        okText={commentModal === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
        cancelText="ยกเลิก"
        okButtonProps={{
          danger: commentModal === 'reject',
          className: '!bg-red-700 hover:!bg-red-800 !border-red-700',
        }}
        width="min(100vw - 2rem, 480px)"
        centered
      >
        <div className="pt-2">
          <label className="block text-sm text-gray-600 mb-2">
            {commentModal === 'approve' ? 'ความเห็นจากผู้อนุมัติ (ถ้ามี)' : 'เหตุผลการปฏิเสธ'}
          </label>
          <Input.TextArea
            rows={4}
            placeholder={commentModal === 'approve' ? 'ไม่บังคับกรอก' : 'กรุณาระบุเหตุผล'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title={previewFile?.fileName ?? 'พรีวิวเอกสาร'}
        open={previewFile != null}
        onCancel={() => setPreviewFile(null)}
        footer={previewFile ? (
          <a
            href={previewFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-700 hover:underline"
          >
            เปิดในแท็บใหม่
          </a>
        ) : null}
        width="min(100vw - 2rem, 900px)"
        centered
        styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
        destroyOnClose
      >
        {previewFile && (
          <div key={previewFile.url} className="flex justify-center bg-gray-100 rounded-lg min-h-[200px]">
            {isImage(previewFile.fileName) ? (
              <img
                key={previewFile.url}
                src={previewFile.url}
                alt={previewFile.fileName}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
              />
            ) : isPdf(previewFile.fileName) ? (
              <iframe
                key={previewFile.url}
                src={previewFile.url}
                title={previewFile.fileName}
                className="w-full min-h-[70vh] border-0 rounded"
              />
            ) : (
              <div className="p-6 text-center text-gray-600">
                <p className="mb-4">ไม่สามารถพรีวิวไฟล์นี้ในหน้าต่างได้</p>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-700 hover:underline"
                >
                  เปิดในแท็บใหม่
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
