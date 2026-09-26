/*
  Warnings:

  - A unique constraint covering the columns `[businessId,date,time]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Appointment_businessId_date_time_key" ON "Appointment"("businessId", "date", "time");
