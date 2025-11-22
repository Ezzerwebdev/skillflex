<?php
// Same-origin PHP proxy for Rocket LMS game API.
// Frontend calls /api/game/* on games.skillflex.education
// We forward it to https://skillflex.education/api/game/*

$backendBase = 'https://skillflex.education/api/game/';

// Polyfill getallheaders if missing (nginx/php-fpm often)
if (!function_exists('getallheaders')) {
  function getallheaders() {
    $headers = [];
    foreach ($_SERVER as $name => $value) {
      if (substr($name, 0, 5) == 'HTTP_') {
        $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
        $headers[$key] = $value;
      }
    }
    if (isset($_SERVER['CONTENT_TYPE']))   $headers['Content-Type'] = $_SERVER['CONTENT_TYPE'];
    if (isset($_SERVER['CONTENT_LENGTH'])) $headers['Content-Length'] = $_SERVER['CONTENT_LENGTH'];
    return $headers;
  }
}

// If someone sends OPTIONS here, just be nice (though same-origin won’t need CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  header('Access-Control-Allow-Origin: https://games.skillflex.education');
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With');
  header('Access-Control-Max-Age: 86400');
  exit;
}

// Build backend target URL: strip /api/game/ from the start and append the rest
$reqUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsed = parse_url($reqUri);
$path   = $parsed['path'] ?? '/';
$query  = isset($parsed['query']) ? ('?'.$parsed['query']) : '';

$prefix = '/api/game/';
$tail   = (strpos($path, $prefix) === 0) ? substr($path, strlen($prefix)) : ltrim($path, '/');
$target = $backendBase . $tail . $query;

// Read body for non-GET/HEAD
$body = in_array($_SERVER['REQUEST_METHOD'], ['GET','HEAD']) ? null : file_get_contents('php://input');

// Prepare cURL
$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true); // include headers in output so we can forward selectively
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Body
if (!is_null($body)) {
  curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward important headers
$headersOut = [];
foreach (getallheaders() as $name => $value) {
  $lname = strtolower($name);
  if (in_array($lname, ['authorization','content-type','accept','x-requested-with'])) {
    $headersOut[] = $name . ': ' . $value;
  }
}
if (!array_filter($headersOut, fn($h)=> stripos($h, 'Accept:')===0)) {
  $headersOut[] = 'Accept: application/json';
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headersOut);

// Execute
$response = curl_exec($ch);
if ($response === false) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>false,'error'=>'bad_gateway','detail'=>curl_error($ch)]);
  exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$respHeaders = substr($response, 0, $headerSize);
$respBody    = substr($response, $headerSize);
curl_close($ch);

// Forward status
http_response_code($statusCode);

// Forward a safe subset of headers (avoid backend CORS reflection)
$hopByHop = [
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailers','transfer-encoding','upgrade'
];

foreach (explode("\r\n", $respHeaders) as $line) {
  if (strpos($line, ':') === false) continue;
  [$hName, $hVal] = array_map('trim', explode(':', $line, 2));
  $lname = strtolower($hName);

  if (in_array($lname, $hopByHop)) continue;
  if (str_starts_with($lname, 'access-control-allow-')) continue; // same-origin now

  if (in_array($lname, ['content-type','cache-control','pragma','expires','last-modified','etag'])) {
    header("$hName: $hVal", true);
  }
}

// Default content-type if backend didn’t include one we forwarded
if (!headers_sent()) {
  header('Content-Type: application/json');
}

echo $respBody;
