import api from "../api";

const getShipmentMethods = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload
  });
}

const getCountryOptions = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload,
    cache: true
  });
}

const getStateOptions = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload,
    cache: true
  });
}

export const UtilService = {
  getCountryOptions,
  getStateOptions,
  getShipmentMethods
}