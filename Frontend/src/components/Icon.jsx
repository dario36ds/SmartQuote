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
} from "react-icons/md";

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
  phone: MdOutlineCall,
  pin: MdOutlineLocationOn,
  store: MdOutlineStorefront,
  check: MdOutlineCheckCircle,
  money: MdOutlinePayments,
  trend: MdOutlineTrendingUp,
  eye: MdOutlineVisibility,
  sparkle: MdOutlineAutoAwesome,
  edit: MdOutlineEdit,
  trash: MdOutlineDelete,
  close: MdOutlineClose,
  logout: MdOutlineLogout,
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
