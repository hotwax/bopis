import api from "../api";

const getShipmentMethods = async (payload: any): Promise<any> => {
  return api({
    url: "",
    method: "post",
    data: payload
  });
}

export const UtilService = {
  getShipmentMethods
}