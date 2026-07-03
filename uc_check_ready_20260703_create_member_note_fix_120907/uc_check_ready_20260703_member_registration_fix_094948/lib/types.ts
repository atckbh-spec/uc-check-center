export type StaffRole = "owner" | "admin" | "coach" | "front_desk";
export type MemberStatus = "active" | "inactive" | "paused" | "archived";
export type PassStatus = "active" | "paused" | "expired" | "used_up" | "cancelled";
export type ServiceType = "pt" | "conditioning" | "group" | "trial" | "other";
export type AttendanceStatus = "checked_in" | "cancelled" | "no_show" | "manual_adjustment";
export type AttendanceSource = "staff" | "kiosk" | "system";

export type StaffUser = {
  id: string;
  organization_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
};

export type Member = {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  phone_last4: string;
  pin_hash?: string | null;
  birth_date?: string | null;
  status: MemberStatus;
  assigned_coach_id: string | null;
  first_visit_date: string | null;
  last_visit_date: string | null;
  memo: string | null;
};

export type MemberPass = {
  id: string;
  organization_id: string;
  member_id: string;
  pass_name: string;
  service_type: ServiceType;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  start_date: string;
  end_date: string | null;
  status: PassStatus;
  assigned_coach_id: string | null;
};

export type AttendanceLog = {
  id: string;
  organization_id: string;
  member_id: string;
  member_pass_id: string | null;
  checkin_at: string;
  attendance_date: string;
  service_type: ServiceType | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  deducted_sessions: number;
  checked_by: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  memo: string | null;
};

export type CheckInResult = {
  success: boolean;
  message: string;
  memberMaskedName?: string;
  passName?: string;
  remainingSessionsAfterCheckIn?: number;
  attendanceSessionNumber?: number;
  attendanceDate?: string;
};
