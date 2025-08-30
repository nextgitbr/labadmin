// Função para calcular dias úteis (segunda a sexta)
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate);
  let daysToAdd = businessDays;
  
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1);
    // Se não for sábado (6) nem domingo (0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysToAdd--;
    }
  }
  
  return result;
}

// Função para verificar se uma data é dia útil
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Não é domingo nem sábado
}

// Função para calcular dias úteis entre duas datas
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;
  
  while (start <= end) {
    if (isBusinessDay(start)) {
      businessDays++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return businessDays;
}

// Função para obter próximo dia útil
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  
  do {
    result.setDate(result.getDate() + 1);
  } while (!isBusinessDay(result));
  
  return result;
}
