"use client";

import { useState, useCallback } from "react";
import type { Vehicle, Service, ServiceAddon, CustomerAddress } from "@/lib/types";

/** State of the booking wizard */
export interface BookingState {
  /** Step 1: Selected vehicle */
  vehicle: Vehicle | null;
  /** Step 2: Selected service */
  service: Service | null;
  /** Step 3: Selected addons */
  addons: ServiceAddon[];
  /** Step 4: Selected address */
  address: CustomerAddress | null;
  /** Step 5: Selected date */
  scheduledDate: string | null;
  /** Step 5: Selected time slot */
  scheduledTimeSlot: string | null;
  /** Current step index (0-6) */
  currentStep: number;
}

const initialState: BookingState = {
  vehicle: null,
  service: null,
  addons: [],
  address: null,
  scheduledDate: null,
  scheduledTimeSlot: null,
  currentStep: 0,
};

/**
 * Hook to manage booking wizard state.
 */
export function useBookingState() {
  const [state, setState] = useState<BookingState>(initialState);

  const setVehicle = useCallback((vehicle: Vehicle) => {
    setState((prev) => ({ ...prev, vehicle }));
  }, []);

  const setService = useCallback((service: Service) => {
    setState((prev) => ({ ...prev, service }));
  }, []);

  const toggleAddon = useCallback((addon: ServiceAddon) => {
    setState((prev) => {
      const exists = prev.addons.find((a) => a.id === addon.id);
      return {
        ...prev,
        addons: exists
          ? prev.addons.filter((a) => a.id !== addon.id)
          : [...prev.addons, addon],
      };
    });
  }, []);

  const setAddress = useCallback((address: CustomerAddress) => {
    setState((prev) => ({ ...prev, address }));
  }, []);

  const setSchedule = useCallback(
    (scheduledDate: string, scheduledTimeSlot: string) => {
      setState((prev) => ({ ...prev, scheduledDate, scheduledTimeSlot }));
    },
    []
  );

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, 6)),
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /** Calculate pricing based on vehicle size */
  const calculatePricing = useCallback(() => {
    const { service, vehicle, addons } = state;
    if (!service) return { subtotal: 0, tax: 0, total: 0, servicePrice: 0, addonsTotal: 0 };

    const sizeCategory = vehicle?.size_category || "medium";
    const servicePrice = service.price_by_vehicle_size[sizeCategory] || service.base_price_usd;

    const addonsTotal = addons.reduce((sum, addon) => {
      const addonPrice =
        addon.price_by_vehicle_size?.[sizeCategory] ?? addon.price_usd;
      return sum + addonPrice;
    }, 0);

    const subtotal = servicePrice + addonsTotal;
    const tax = 0;
    const total = subtotal;

    return { subtotal, tax, total, servicePrice, addonsTotal };
  }, [state]);

  /** Check if current step can proceed */
  const canProceed = useCallback(() => {
    switch (state.currentStep) {
      case 0: return !!state.vehicle;
      case 1: return !!state.service;
      case 2: return true; // Addons are optional
      case 3: return !!state.address;
      case 4: return !!state.scheduledDate && !!state.scheduledTimeSlot;
      case 5: return true; // Summary - always can confirm
      default: return false;
    }
  }, [state]);

  return {
    state,
    setVehicle,
    setService,
    toggleAddon,
    setAddress,
    setSchedule,
    nextStep,
    prevStep,
    goToStep,
    reset,
    calculatePricing,
    canProceed,
  };
}
