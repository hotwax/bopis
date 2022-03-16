import api from "../api";

const getShipmentMethods = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload
  });
}

const getCountries = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload,
    cache: true
  });
}

const getStates = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "post",
    data: payload,
    cache: true
  });
}

export const UtilService = {
  getCountries,
  getStates,
  getShipmentMethods
}