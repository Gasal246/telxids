import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDatePretty(date: string | Date): string {
  if (typeof date === "string") {
    date = new Date(date);
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const hour = date.getHours();
  const ampm = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${monthNames[monthIndex]} ${year}, ${hour12}:${minutes}${ampm}`;
}
