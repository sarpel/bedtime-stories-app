import { useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ExternalLink, Key, HelpCircle, X } from "lucide-react";

interface ApiKeyHelpProps {
  onClose: () => void;
}

export default function ApiKeyHelp({ onClose }: ApiKeyHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Key className="h-6 w-6 text-primary" />
                API Anahtarı Kurulumu
              </CardTitle>
              <CardDescription>
                ElevenLabs ve OpenAI API anahtarlarını nasıl alacağınızı öğrenin
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose} size="sm">
              <X className="h-4 w-4 mr-2" />
              Kapat
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* ElevenLabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">ElevenLabs API Anahtarı</h3>
              <Badge variant="outline" className="text-xs">
                Gerekli
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                  Hızlı Kurulum:
                </h4>
                <ol className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  <li>
                    1.{" "}
                    <a
                      href="https://elevenlabs.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-orange-900 dark:hover:text-orange-100"
                    >
                      ElevenLabs.io
                    </a>
                    'ya gidin
                  </li>
                  <li>2. Ücretsiz hesap oluşturun</li>
                  <li>3. Profile Settings → API Key → Generate New Key</li>
                  <li>
                    4. API anahtarını kopyalayın (xi-api-key-... formatında)
                  </li>
                  <li>5. Backend .env dosyasına ekleyin (GÜVENLİ)</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <Key className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">
                        ✅ GÜVENLİ: Backend .env (ÖNERİLEN)
                      </h5>
                      <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                        API anahtarları sunucuda kalır, asla browser'a
                        gönderilmez
                      </p>
                      <code className="text-xs bg-green-100 dark:bg-green-900/30 p-2 rounded block">
                        backend/.env dosyasına ekleyin:
                        <br />
                        ELEVENLABS_API_KEY=xi-api-key-your-key-here
                      </code>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">
                        ❌ GÜVENSİZ: Frontend .env (KULLANMAYIN)
                      </h5>
                      <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                        API anahtarları JavaScript bundle'a gömülür, herkes
                        görebilir!
                      </p>
                      <code className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded block line-through opacity-50">
                        .env dosyasına EKLEMEYIN:
                        <br />
                        VITE_ELEVENLABS_API_KEY=... (GÜVENLİK RİSKİ!)
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            {/* OpenAI */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">OpenAI API Anahtarı</h3>
                <Badge variant="outline" className="text-xs">
                  Gerekli
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Hızlı Kurulum:
                  </h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>
                      1.{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        OpenAI Platform
                      </a>
                      'a gidin
                    </li>
                    <li>2. Hesap oluşturun veya giriş yapın</li>
                    <li>3. API Keys → Create new secret key</li>
                    <li>4. API anahtarını kopyalayın (sk-... formatında)</li>
                    <li>5. Backend .env dosyasına ekleyin (GÜVENLİ)</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <Key className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">
                          ✅ GÜVENLİ: Backend .env (ÖNERİLEN)
                        </h5>
                        <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                          API anahtarları sunucuda kalır, asla browser'a
                          gönderilmez
                        </p>
                        <code className="text-xs bg-green-100 dark:bg-green-900/30 p-2 rounded block">
                          backend/.env dosyasına ekleyin:
                          <br />
                          OPENAI_API_KEY=sk-your-key-here
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">
                          ❌ GÜVENSİZ: Frontend .env (KULLANMAYIN)
                        </h5>
                        <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                          API anahtarları JavaScript bundle'a gömülür, herkes
                          görebilir!
                        </p>
                        <code className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded block line-through opacity-50">
                          .env dosyasına EKLEMEYIN:
                          <br />
                          VITE_OPENAI_API_KEY=... (GÜVENLİK RİSKİ!)
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Önemli Notlar */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">
              🔒 Güvenlik ve Önemli Notlar
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  <strong>
                    SADECE backend/.env dosyasına API anahtarı ekleyin!
                  </strong>{" "}
                  Frontend .env dosyası güvenli değildir.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  API anahtarlarınızı asla GitHub'a yüklemeyin (.gitignore ile
                  korunmuş olmalı)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  ElevenLabs ücretsiz hesabı ile aylık 10,000 karakter
                  kullanabilirsiniz
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>OpenAI ücretsiz hesabı ile aylık $5 kredi alırsınız</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  API anahtarlarını backend/.env dosyasına ekledikten sonra
                  backend'i yeniden başlatın
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>
                  Frontend'i yeniden build etmenize gerek yok - backend çalışma
                  zamanında .env dosyasını okur
                </span>
              </div>
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => window.open("https://elevenlabs.io", "_blank")}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                ElevenLabs'a Git
              </Button>
              <Button
                onClick={() =>
                  window.open("https://platform.openai.com/api-keys", "_blank")
                }
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                OpenAI'a Git
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
