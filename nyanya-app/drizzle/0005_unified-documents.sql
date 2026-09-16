-- Единый перечень документов для всех категорий (2026-08).
-- Добавляем типы: сертификат ВИЧ/СПИД, справка по ЗППП, водительское удостоверение.
-- ALTER TYPE ... ADD VALUE идемпотентен только с IF NOT EXISTS (PostgreSQL 12+).
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'medical_hiv';
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'medical_std';
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'driver_license';
