package com.naturalmilk.dairy.natural_milk_dairy

import android.Manifest
import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.naturalmilk.dairy/app_launcher"
    private val REQUEST_IMAGE_CAPTURE = 2024
    private val REQUEST_CAMERA_PERMISSION = 2025
    private var pendingCameraResult: MethodChannel.Result? = null
    private var currentPhotoPath: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openMap" -> {
                    val url = call.argument<String>("url")
                    if (url != null) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("MAP_ERROR", e.message, null)
                        }
                    } else {
                        result.error("INVALID_URL", "URL cannot be null", null)
                    }
                }
                "openDialer" -> {
                    val phone = call.argument<String>("phone")
                    if (phone != null) {
                        try {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("DIAL_ERROR", e.message, null)
                        }
                    } else {
                        result.error("INVALID_PHONE", "Phone cannot be null", null)
                    }
                }
                "openUrl" -> {
                    val url = call.argument<String>("url")
                    if (url != null) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("URL_ERROR", e.message, null)
                        }
                    } else {
                        result.error("INVALID_URL", "URL cannot be null", null)
                    }
                }
                "downloadPdf", "printHtml" -> {
                    val html = call.argument<String>("html")
                    val jobName = call.argument<String>("fileName") ?: call.argument<String>("jobName") ?: "Natural_Milk_Dairy_Report"
                    if (html != null) {
                        try {
                            runOnUiThread {
                                val webView = android.webkit.WebView(this)
                                webView.webViewClient = object : android.webkit.WebViewClient() {
                                    override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                                        try {
                                            val printManager = getSystemService(android.content.Context.PRINT_SERVICE) as? android.print.PrintManager
                                            val printAdapter = webView.createPrintDocumentAdapter(jobName)
                                            val printAttributes = android.print.PrintAttributes.Builder()
                                                .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
                                                .build()
                                            printManager?.print(jobName, printAdapter, printAttributes)
                                            result.success(true)
                                        } catch (e: Exception) {
                                            result.error("PRINT_ERROR", e.message, null)
                                        }
                                    }
                                }
                                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                            }
                        } catch (e: Exception) {
                            result.error("PRINT_ERROR", e.message, null)
                        }
                    } else {
                        result.error("INVALID_HTML", "HTML cannot be null", null)
                    }
                }
                "takePhoto" -> {
                    // Check and request runtime CAMERA permission first
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                        checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        pendingCameraResult = result
                        requestPermissions(arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA_PERMISSION)
                    } else {
                        launchCamera(result)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun launchCamera(result: MethodChannel.Result) {
        try {
            pendingCameraResult = result
            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)

            // Create temporary photo file in cache directory
            val photoFile = File(cacheDir, "proof_${System.currentTimeMillis()}.jpg")
            currentPhotoPath = photoFile.absolutePath

            val photoUri: Uri = FileProvider.getUriForFile(
                this,
                "${applicationContext.packageName}.fileprovider",
                photoFile
            )

            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            takePictureIntent.clipData = ClipData.newRawUri("", photoUri)
            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)

            // Grant permission to candidate activities
            val resolvedActivities = packageManager.queryIntentActivities(
                takePictureIntent,
                PackageManager.MATCH_DEFAULT_ONLY
            )
            for (resolveInfo in resolvedActivities) {
                val pkg = resolveInfo.activityInfo.packageName
                grantUriPermission(
                    pkg,
                    photoUri,
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            startActivityForResult(takePictureIntent, REQUEST_IMAGE_CAPTURE)
        } catch (e: Exception) {
            pendingCameraResult = null
            currentPhotoPath = null
            result.error("CAMERA_ERROR", e.message ?: "Failed to open camera", null)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            val res = pendingCameraResult
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (res != null) {
                    launchCamera(res)
                }
            } else {
                pendingCameraResult = null
                res?.error(
                    "PERMISSION_DENIED",
                    "Camera permission was denied. Please grant camera permission to take delivery proof.",
                    null
                )
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_IMAGE_CAPTURE) {
            val res = pendingCameraResult
            pendingCameraResult = null
            val path = currentPhotoPath
            currentPhotoPath = null

            if (resultCode == Activity.RESULT_OK) {
                try {
                    var bitmap: Bitmap? = null

                    // 1. Try reading the full-resolution file saved by FileProvider
                    if (path != null) {
                        val file = File(path)
                        if (file.exists() && file.length() > 0) {
                            // Downsample large images to avoid OutOfMemoryError
                            val boundsOptions = BitmapFactory.Options().apply {
                                inJustDecodeBounds = true
                            }
                            BitmapFactory.decodeFile(path, boundsOptions)

                            var sampleSize = 1
                            val maxDimension = 1280
                            while (boundsOptions.outWidth / sampleSize > maxDimension ||
                                boundsOptions.outHeight / sampleSize > maxDimension
                            ) {
                                sampleSize *= 2
                            }

                            val loadOptions = BitmapFactory.Options().apply {
                                inSampleSize = sampleSize
                            }
                            bitmap = BitmapFactory.decodeFile(path, loadOptions)
                            try { file.delete() } catch (_: Exception) {}
                        }
                    }

                    // 2. Fallback to data.data Uri if file was empty
                    if (bitmap == null && data?.data != null) {
                        val stream = contentResolver.openInputStream(data.data!!)
                        bitmap = BitmapFactory.decodeStream(stream)
                        stream?.close()
                    }

                    // 3. Fallback to thumbnail bitmap in data.extras
                    if (bitmap == null) {
                        bitmap = data?.extras?.get("data") as? Bitmap
                    }

                    if (bitmap != null) {
                        val outputStream = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
                        val base64Str = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                        res?.success("data:image/jpeg;base64,$base64Str")
                    } else {
                        res?.error("NO_IMAGE_DATA", "Camera did not return image data", null)
                    }
                } catch (e: Exception) {
                    res?.error("PROCESS_ERROR", e.message ?: "Error processing camera image", null)
                }
            } else {
                // Cancelled by user
                if (path != null) {
                    try { File(path).delete() } catch (_: Exception) {}
                }
                res?.success(null)
            }
        }
    }
}
