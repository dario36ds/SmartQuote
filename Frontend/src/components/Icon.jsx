import {
  MdChevronRight,
  MdOutlineAdd,
  MdOutlineAutoAwesome,
  MdOutlineCall,
  MdOutlineCheckCircle,
  MdOutlineClose,
  MdOutlineDelete,
  MdOutlineDescription,
  MdOutlineEdit,
  MdOutlineGridView,
  MdOutlineLocationOn,
  MdOutlineLogout,
  MdOutlineMail,
  MdOutlineNotificationsNone,
  MdOutlinePayments,
  MdOutlinePeople,
  MdOutlinePerson,
  MdOutlinePersonAddAlt,
  MdOutlineRequestQuote,
  MdOutlineSearch,
  MdOutlineStorefront,
  MdOutlineTrendingUp,
  MdOutlineTune,
  MdOutlineVisibility,
  MdOutlineVisibilityOff,
  MdOutlineCalendarMonth,
  MdOutlineContentCopy,
  MdOutlineOpenInNew,
  MdOutlineSave,
  MdOutlineSend,
  MdOutlineExpandLess,
  MdOutlineExpandMore,
  MdOutlineRefresh,
  MdOutlineSettings,
  MdOutlineLock,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";

const icons = {
  grid: MdOutlineGridView,
  document: MdOutlineDescription,
  quote: MdOutlineRequestQuote,
  users: MdOutlinePeople,
  user: MdOutlinePerson,
  userPlus: MdOutlinePersonAddAlt,
  search: MdOutlineSearch,
  plus: MdOutlineAdd,
  bell: MdOutlineNotificationsNone,
  chevron: MdChevronRight,
  filters: MdOutlineTune,
  mail: MdOutlineMail,
  whatsapp: FaWhatsapp,
  phone: MdOutlineCall,
  pin: MdOutlineLocationOn,
  store: MdOutlineStorefront,
  check: MdOutlineCheckCircle,
  money: MdOutlinePayments,
  trend: MdOutlineTrendingUp,
  eye: MdOutlineVisibility,
  eyeOff: MdOutlineVisibilityOff,
  sparkle: MdOutlineAutoAwesome,
  edit: MdOutlineEdit,
  trash: MdOutlineDelete,
  close: MdOutlineClose,
  logout: MdOutlineLogout,
  calendar: MdOutlineCalendarMonth,
  copy: MdOutlineContentCopy,
  external: MdOutlineOpenInNew,
  save: MdOutlineSave,
  send: MdOutlineSend,
  collapse: MdOutlineExpandLess,
  expand: MdOutlineExpandMore,
  refresh: MdOutlineRefresh,
  settings: MdOutlineSettings,
  lock: MdOutlineLock,
};

export default function Icon({ name, size = 20, className = "" }) {
  const IconComponent = icons[name];

  return (
    <IconComponent
      className={`sq-icon ${className}`}
      size={size}
      aria-hidden="true"
      focusable="false"
    />
  );
}
