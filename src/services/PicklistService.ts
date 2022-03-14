import api from "@/api"

const getPickers = async (query: any): Promise<any> => {
  return api({
    url: 'warehouse-party',
    method: 'POST',
    data: query
  })
}

const createOrderItemPicklist = async (payload: any): Promise<any> => {
  return api({
    url: 'createOrderItemPicklist',
    method: 'POST',
    data: payload
  })
}

export const PicklistService = {
  getPickers,
  createOrderItemPicklist
}