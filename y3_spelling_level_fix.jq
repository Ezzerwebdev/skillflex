def set_levels($m):
  map(if ($m[.id]? // null) then .level = $m[.id] else . end);

($MAP) as $M
| if   type=="array"      then set_levels($M)
  elif has("activities")  then .activities |= set_levels($M)
  elif has("data")        then .data       |= set_levels($M)
  else . end
