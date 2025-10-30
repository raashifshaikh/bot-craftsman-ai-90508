import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration, params, context } = await req.json();

    let headers: any = {
      "Content-Type": "application/json",
    };

    // Handle authentication
    if (integration.auth_type === "api_key") {
      headers[integration.credentials.header_name || "X-API-Key"] = integration.credentials.api_key;
    } else if (integration.auth_type === "bearer") {
      headers["Authorization"] = `Bearer ${integration.credentials.token}`;
    } else if (integration.auth_type === "basic") {
      const encoded = btoa(`${integration.credentials.username}:${integration.credentials.password}`);
      headers["Authorization"] = `Basic ${encoded}`;
    }

    // Build URL
    let url = integration.endpoint_base_url;
    if (params.path) {
      url += params.path;
    }
    if (params.query) {
      const queryString = new URLSearchParams(params.query).toString();
      url += `?${queryString}`;
    }

    // Make API call
    const response = await fetch(url, {
      method: params.method || "GET",
      headers,
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    const data = await response.json();

    // Apply mapping if configured
    let result = data;
    if (integration.mapping_config?.response_mapping) {
      result = applyMapping(data, integration.mapping_config.response_mapping);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      message: "API call executed successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API execution error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function applyMapping(data: any, mapping: any): any {
  const result: any = {};
  
  for (const [key, path] of Object.entries(mapping)) {
    const pathParts = (path as string).split(".");
    let value = data;
    
    for (const part of pathParts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    result[key] = value;
  }
  
  return result;
}
