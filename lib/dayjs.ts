import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'

dayjs.extend(buddhistEra)
dayjs.locale('th')

export default dayjs

/** รูปแบบวันที่แสดงในฟอร์ม/ปicker (วัน/เดือน/ปี พ.ศ.) */
export const DATE_DISPLAY_FORMAT = 'DD/MM/BBBB'
