import { startOfSecond } from "date-fns/fp/startOfSecond";
import { api } from "./api";

export interface ScheduleFormData {
 courseId: number 
 courseName: string
 allowedDays: string[]
 startTime: string 
 endTime: string 
 checkInWindowTimes?: number
 latitude: number
 longitude: number
 radiusMeters: number
}

export interface SessionResponse {
 sessionId: number
 qrToken: string 
 expiredAt: number 
 allowedDays: string[]
 todayAllowed: boolean 
 status: 'ACTIVE' | 'CLOSED' | 'EXPIRED'
}
export interface CheckInRequest {
  studentId: number
  latitude: number
  longitude: number
  radiusMeters: number
}


export const attendanceService = {
  
  async createSchedule(data: ScheduleFormData) {
    return api.post('/attendance/schedule', data)
  },
  
  async startSession(scheduleId: number): Promise<SessionResponse> {
    return api.post<SessionResponse>('/attendance/session/start', {scheduleId})
  },

  async CloseSession(sessionId: number) {
    return api.patch(`/attendance/session/close?sessionId=${sessionId}`)
  },
  
  async checkIn(payload: CheckInRequest) {
    return api.post('/attendance/check-in', payload)
  },
  
}
