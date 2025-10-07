import { apiClient, client, hasError } from '@/adapter';

import store from '@/store';

const login = async (username: string, password: string): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "login", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}

const getUserProfile = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "admin/user/profile",
      method: "get",
      baseURL,
      headers: {
        "Authorization":  "Bearer " + token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp.data));
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const fetchOmsInstanceName = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "admin/checkLoginOptions",
      method: "get",
      baseURL,
      headers: {
        "Authorization":  "Bearer " + token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) { 
      return Promise.reject("Error getting oms instance name: " + JSON.stringify(resp.data)); 
    }
    return Promise.resolve(resp.data?.omsInstanceName)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const getCurrentEComStore = async (token: any, facilityId: any): Promise<any> => {

  // If the facilityId is not provided, it may be case of user not associated with any facility or the logout
  if (!facilityId) {
    return Promise.resolve({});
  }

  const baseURL = store.getters['user/getOmsBaseUrl'];
  try {
    const data = {
      "inputFields": {
        "facilityId": facilityId,
      },
      "fieldList": ["defaultCurrencyUomId", "productStoreId"],
      "entityName": "ProductStoreFacilityDetail",
      "noConditionFind": "Y",
      "distinct": "Y",
      "filterByDate": "Y"
    }
    
    const resp = await client({
      url: "performFind",
      method: "post",
      data,
      baseURL,
      headers: {
        "Authorization":  "Bearer " + token,
        "Content-Type": "application/json"
      }
    });
    if (hasError(resp)) {
      throw resp.data;
    }
    
    return Promise.resolve(resp.data.docs?.length ? resp.data.docs[0] : {});
  } catch(error: any) {
    return Promise.resolve({})
  }
}
const getRerouteFulfillmentConfig = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const updateRerouteFulfillmentConfig = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "service/updateProductStoreSetting",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getPartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload,
  });
}

const createPartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "service/createProductStoreSetting",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updatePartialOrderRejectionConfig = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/updateProductStoreSetting",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getUserPermissions = async (payload: any, url: string, token: any): Promise<any> => {
  // Currently, making this request in ofbiz
  const baseURL = url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
  let serverPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return serverPermissions;
  // TODO pass specific permissionIds
  let resp;
    // TODO Make it configurable from the environment variables.
    // Though this might not be an server specific configuration, 
    // we will be adding it to environment variable for easy configuration at app level
    const viewSize = 200;

    try {
      const params = {
        "viewIndex": 0,
        viewSize,
        permissionIds: payload.permissionIds
      }
      resp = await apiClient({
        url: "getPermissions",
        method: "post",
        baseURL,
        data: params,
        headers: {
          Authorization:  'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      })
      if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
        serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
        const total = resp.data.count;
        const remainingPermissions = total - serverPermissions.length;
        if (remainingPermissions > 0) {
          // We need to get all the remaining permissions
          const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + ( remainingPermissions % viewSize != 0 ? 1 : 0);
          const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
            const response = await apiClient({
              url: "getPermissions",
              method: "post",
              baseURL,
              data: {
                "viewIndex": index + 1,
                viewSize,
                permissionIds: payload.permissionIds
              },
              headers: {
                Authorization:  'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            })
            if(!hasError(response)){
              return Promise.resolve(response);
              } else {
              return Promise.reject(response);
              }
          }))
          const permissionResponses = {
            success: [],
            failed: []
          }
          responses.reduce((permissionResponses: any, permissionResponse: any) => {
            if (permissionResponse.status !== 200 || hasError(permissionResponse) || !permissionResponse.data?.docs) {
              permissionResponses.failed.push(permissionResponse);
            } else {
              permissionResponses.success.push(permissionResponse);
            }
            return permissionResponses;
          }, permissionResponses)

          serverPermissions = permissionResponses.success.reduce((serverPermissions: any, response: any) => {
            serverPermissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
            return serverPermissions;
          }, serverPermissions)

          // If partial permissions are received and we still allow user to login, some of the functionality might not work related to the permissions missed.
          // Show toast to user intimiting about the failure
          // Allow user to login
          // TODO Implement Retry or improve experience with show in progress icon and allowing login only if all the data related to user profile is fetched.
          if (permissionResponses.failed.length > 0) Promise.reject("Something went wrong while getting complete user permissions.");
        }
      }
      return serverPermissions;
    } catch(error: any) {
      // TODO: added this to handle the flow on 401, need to remove this once we move to support of passing systemType at endpoint level
      if(error.response.status === 401) {
        store.dispatch("user/logout", { isUserUnauthorised: true });
        const redirectUrl = window.location.origin + '/login'
        window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
      }
      return Promise.reject(error);
    }
}

const ensurePartyRole = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/ensurePartyRole",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

export const UserService = {
    ensurePartyRole,
    fetchOmsInstanceName,
    login,
    getCurrentEComStore,
    getRerouteFulfillmentConfig,
    getUserPermissions,
    getUserProfile,
    updateRerouteFulfillmentConfig,
    getPartialOrderRejectionConfig,
    createPartialOrderRejectionConfig,
    updatePartialOrderRejectionConfig
}