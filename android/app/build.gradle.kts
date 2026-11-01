plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "gg.theidealcity.inka"
    compileSdk = 34
    defaultConfig {
        applicationId = "gg.theidealcity.inka"
        minSdk = 26
        targetSdk = 34
        versionCode = (System.getenv("INKA_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("INKA_VERSION_NAME") ?: "1.0"
    }
    signingConfigs {
        create("inka") {
            storeFile = file(System.getenv("INKA_KEYSTORE") ?: "inka.jks")
            storePassword = System.getenv("INKA_KEYSTORE_PW") ?: ""
            keyAlias = "inka"
            keyPassword = System.getenv("INKA_KEYSTORE_PW") ?: ""
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("inka")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(files("libs/spotify-app-remote-release-0.8.0.aar"))
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.media:media:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
