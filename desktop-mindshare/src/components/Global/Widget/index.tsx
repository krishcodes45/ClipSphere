import { ClerkLoading, SignedIn, SignedOut, useUser } from "@clerk/clerk-react"
import { Loader } from "../Loader"
import { useEffect, useState } from "react";
import { fetchUserProfile } from "@/lib/utils";
import { useMediaSources } from "@/hooks/useMediaSources";
import MediaConfiguration from "../MediaConfiguration";

const Widget = () => {
    const [profile, setProfile] = useState<{
        status: number;
        user:
        | ({
            subscription: {
              plan: 'PRO' | 'FREE';
            } | null;
            studio: {
              id: string;
              screen: string | null;
              mic: string | null;
              camera: string | null;
              preset: 'HD' | 'SD';
              userId: string | null;
            } | null;
          } & {
            id: string;
            email: string;
            firstname: string | null;
            lastname: string | null;
            createdAt: Date;
            clerkid: string;
          })
        | null;
      }| null>(null);

    const {user} = useUser()
    const {state , fetchMediaResources} = useMediaSources()
    
    useEffect(() => {
        if (user && user.id) {
          const fetchProfile = async () => {
            try {
              const p = await fetchUserProfile(user.id);
              setProfile(p);
            } catch (error) {
              console.error("Failed to fetch user profile:", error);
              setProfile(null);
            }
          };
          fetchProfile();
        }
      }, [user]);
      
      useEffect(() => {
        fetchMediaResources();
    }, []);

    const defaultUser = {
        id: user?.id || '28bd46ff-4cbb-45b7-a97b-b97e731cbf88',
        email: user?.primaryEmailAddress?.emailAddress || 'rittiananth@gmail.com',
        firstname: user?.firstName || 'Ananth',
        lastname: user?.lastName || 'Ritti',
        createdAt: new Date(),
        clerkid: user?.id || 'user_2q7gFHzeJj0FjKCBXK8KqP7obRL',
        subscription: {
            plan: 'PRO' as const
        },
        studio: {
            id: 'studio_default',
            screen: state.displays?.[0]?.id || null,
            mic: state.audioInputs?.[0]?.deviceId || null,
            camera: null,
            preset: 'HD' as const,
            userId: user?.id || '28bd46ff-4cbb-45b7-a97b-b97e731cbf88'
        }
    };

    const activeUser = profile?.user || defaultUser;

    return (
        <div className="p-5 flex flex-col justify-center items-center w-full">
            <MediaConfiguration
                state={state}
                user={activeUser}
            />
        </div>
    );
}

export default Widget