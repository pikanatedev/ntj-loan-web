'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Modal, Input, message, Spin } from 'antd'
import { FilePdfOutlined, FileOutlined } from '@ant-design/icons'
import { supabase, STORAGE_BUCKET } from '@/lib/supabaseClient'
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
  const [previewLoading, setPreviewLoading] = useState(false)

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
      const { error } = await supabase
        .from('loans')
        .update({
          status: commentModal === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ',
          approver_name: user.name,
          approver_comment: comment?.trim() || null,
        })
        .eq('id', id)
      if (error) {
        message.error(error.message || 'อัปเดตสถานะไม่สำเร็จ')
        return
      }
      message.success(commentModal === 'approve' ? 'อนุมัติสินเชื่อเรียบร้อย' : 'บันทึกการปฏิเสธเรียบร้อย')
      setCommentModal(null)
      window.location.href = '/'
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
        const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(att.file_path, 3600)
        if (data?.signedUrl) map[att.file_path] = data.signedUrl
        // ไม่ใช้ getPublicUrl เป็น fallback เพราะ bucket ส่วนใหญ่เป็น private จะได้ 404 "Bucket not found"
      }
      setFileUrls((prev) => ({ ...prev, ...map }))
    }
    loadUrls()
  }, [loan?.id, loan?.loan_attachments])

  useEffect(() => {
    if (previewFile && !isImage(previewFile.fileName) && !isPdf(previewFile.fileName)) {
      setPreviewLoading(false)
    }
  }, [previewFile])

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
        <Link
          href="/"
          className="mt-3 inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 font-medium touch-manipulation"
        >
          กลับ
        </Link>
      </div>
    )
  }

  if (user.role === 'sale' && loan.sale_id !== user.id) {
    return (
      <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] bg-[#FBE437]">
        <p className="text-gray-500 text-sm sm:text-base">ไม่มีสิทธิ์ดูรายการนี้</p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 font-medium touch-manipulation"
        >
          กลับ
        </Link>
      </div>
    )
  }

  const attachments = (loan.loan_attachments ?? []) as LoanAttachment[]
  const canApprove = user.role === 'approver' && loan.status === 'รอตรวจสอบ'
  const canEdit = user.role === 'sale' && loan.status === 'รอตรวจสอบ' && loan.sale_id === user.id

  const loanTypeLabels: Record<string, string> = {
    personal_car: 'รถยนต์ส่วนบุคคล (รถยนต์นั่งไม่เกิน 7 ที่นั่ง)',
    commercial_vehicle: 'รถยนต์เชิงพาณิชย์',
    land_title: 'โฉนดที่ดิน',
  }
  const isLandTitle = loan.loan_type === 'land_title'

  return (
    <div className="px-3 sm:px-4 py-4 max-w-4xl mx-auto min-h-[calc(100dvh-52px)] sm:min-h-screen bg-[#FBE437] pb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-red-700">รายละเอียดสินเชื่อ</h1>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link
              href={`/loan/${id}/edit`}
              className="bg-amber-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-amber-700 text-center font-medium min-h-[48px] flex items-center justify-center touch-manipulation shrink-0"
            >
              แก้ไข
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-gray-200 text-gray-800 px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-300 font-medium min-h-[48px] touch-manipulation shrink-0"
          >
            กลับ
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">เลขที่อ้างอิงสินเชื่อ</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">เลขที่อ้างอิงสินเชื่อ</dt>
            <dd className="text-gray-900">{loan.loan_reference_number ?? '—'}</dd>
            {loan.loan_type && (
              <>
                <dt className="text-gray-500">ประเภทสินเชื่อ</dt>
                <dd className="text-gray-900">{loanTypeLabels[loan.loan_type] ?? loan.loan_type}</dd>
              </>
            )}
          </dl>
        </div>

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

        {isLandTitle ? (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">ข้อมูลที่อยู่อาศัย</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">ที่อยู่</dt>
              <dd className="text-gray-900 col-span-2">{loan.residence_address ?? '—'}</dd>
              <dt className="text-gray-500">เลขที่โฉนด</dt>
              <dd className="text-gray-900">{loan.land_deed_no ?? '—'}</dd>
              <dt className="text-gray-500">รายละเอียดเพิ่มเติม</dt>
              <dd className="text-gray-900 col-span-2">{loan.residence_details ?? '—'}</dd>
            </dl>
          </div>
        ) : (
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
        )}

        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="font-bold text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">ข้อมูลสินเชื่อ</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">วันที่เสนอสินเชื่อ</dt>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {attachments.map((att) => {
                const url = fileUrls[att.file_path]
                const isImg = isImage(att.file_name)
                const isPdfFile = isPdf(att.file_name)
                const openPreview = () => {
                  if (url) {
                    setPreviewFile({ url, fileName: att.file_name })
                    setPreviewLoading(true)
                  }
                }
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={openPreview}
                    disabled={!url}
                    className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden text-left hover:border-red-300 hover:bg-red-50/30 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {!url ? (
                      <div className="aspect-square flex flex-col items-center justify-center text-gray-400 p-3">
                        <Spin size="small" />
                        <span className="text-xs mt-2">กำลังโหลด...</span>
                      </div>
                    ) : isImg ? (
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={url}
                          alt={att.file_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center text-gray-500 p-3">
                        {isPdfFile ? (
                          <FilePdfOutlined style={{ fontSize: 40, color: '#b91c1c' }} />
                        ) : (
                          <FileOutlined style={{ fontSize: 40, color: '#6b7280' }} />
                        )}
                        <span className="text-xs mt-2 truncate w-full text-center" title={att.file_name}>
                          {isPdfFile ? 'PDF' : att.file_name}
                        </span>
                      </div>
                    )}
                    {url && (
                      <p className="text-xs text-gray-500 truncate px-2 py-1.5 bg-white" title={att.file_name}>
                        {att.file_name}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
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
        title={commentModal === 'approve' ? 'อนุมัติสินเชื่อ' : 'ปฏิเสธสินเชื่อ'}
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
        onCancel={() => {
          setPreviewFile(null)
          setPreviewLoading(false)
        }}
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
          <div
            key={previewFile.url}
            className="relative bg-gray-100 rounded-lg flex items-center justify-center"
            style={{ minHeight: '70vh' }}
          >
            {previewLoading && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10"
                style={{ minHeight: '70vh' }}
              >
                <Spin size="large" />
              </div>
            )}
            {isImage(previewFile.fileName) ? (
              <img
                key={previewFile.url}
                src={previewFile.url}
                alt={previewFile.fileName}
                className={`max-w-full max-h-[70vh] w-auto h-auto object-contain ${previewLoading ? 'invisible absolute' : ''}`}
                onLoad={() => setPreviewLoading(false)}
                onError={() => setPreviewLoading(false)}
              />
            ) : isPdf(previewFile.fileName) ? (
              <iframe
                key={previewFile.url}
                src={previewFile.url}
                title={previewFile.fileName}
                className={`w-full border-0 rounded ${previewLoading ? 'invisible absolute' : ''}`}
                style={{ minHeight: '70vh' }}
                onLoad={() => setPreviewLoading(false)}
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
