export type Nullable<T> = T | null;

interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONValue = Nullable<string | number | boolean | JSONObject | JSONValue[]>;
